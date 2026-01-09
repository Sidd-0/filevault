package main

import (
	"log"
	"net/http"
	"sync"
	"time"
)

const (
	defaultCallsPerSecond = 2
	defaultStorageQuotaMB = 10
)

type RateLimiter struct {
	calls map[string][]*time.Time
	mu    sync.Mutex
}

var limiter = &RateLimiter{
	calls: make(map[string][]*time.Time),
}

func RateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := r.Header.Get("X-User-ID")
		if userID == "" {
			userID = r.RemoteAddr
		}

		allowed, remaining := limiter.CheckLimit(userID, defaultCallsPerSecond)

		w.Header().Set("X-RateLimit-Limit", "2")
		w.Header().Set("X-RateLimit-Remaining", remaining)

		if !allowed {
			log.Printf("âš ï¸  Rate limit exceeded for user %s", userID)
			http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func (rl *RateLimiter) CheckLimit(userID string, callsPerSecond int) (bool, string) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	calls, exists := rl.calls[userID]
	if !exists {
		calls = []*time.Time{}
	}

	oneSecondAgo := now.Add(-time.Second)
	var recentCalls []*time.Time
	for _, call := range calls {
		if call.After(oneSecondAgo) {
			recentCalls = append(recentCalls, call)
		}
	}

	recentCallCount := len(recentCalls)
	remaining := callsPerSecond - recentCallCount

	if remaining <= 0 {
		rl.calls[userID] = recentCalls
		return false, "0"
	}

	recentCalls = append(recentCalls, &now)
	rl.calls[userID] = recentCalls

	return true, string(rune(remaining - 1))
}

func GetUserQuota(userID string) (*map[string]interface{}, error) {
	var usedBytes int64
	var limitMB int

	err := db.QueryRow(
		`SELECT storage_used_bytes, storage_limit_mb FROM user_quotas WHERE user_id = $1`,
		userID,
	).Scan(&usedBytes, &limitMB)

	if err != nil {
		limitMB = defaultStorageQuotaMB
		db.Exec(
			`INSERT INTO user_quotas (user_id, storage_limit_mb)
			 VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING`,
			userID, limitMB,
		)
	}

	return &map[string]interface{}{
		"user_id":      userID,
		"used_bytes":   usedBytes,
		"limit_mb":     limitMB,
		"limit_bytes":  int64(limitMB) * 1024 * 1024,
	}, nil
}

func CheckStorageQuota(userID string, fileSize int64) (bool, error) {
	quota, err := GetUserQuota(userID)
	if err != nil {
		return false, err
	}

	limitBytes := (*quota)["limit_bytes"].(int64)
	usedBytes := (*quota)["used_bytes"].(int64)
	available := limitBytes - usedBytes

	return fileSize <= available, nil
}

func UpdateStorageUsage(userID string, fileSize int64) error {
	_, err := db.Exec(
		`UPDATE user_quotas SET storage_used_bytes = storage_used_bytes + $1
		 WHERE user_id = $2`,
		fileSize, userID,
	)
	return err
}

