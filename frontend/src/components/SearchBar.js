import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, SlidersHorizontal, X } from "lucide-react";

const SearchBar = ({
  searchQuery,
  setSearchQuery,
  filters,
  setFilters,
  showAdvanced,
  setShowAdvanced,
  onSearch,
  onClear,
  loading,
}) => {
  const hasFilters = searchQuery || Object.values(filters).some((v) => v);

  return (
    <motion.div
      className="search-section"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      <form className="search-form glass" onSubmit={onSearch}>
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search files by name…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary"
        >
          Search
        </button>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`btn btn-secondary ${showAdvanced ? "active" : ""}`}
        >
          <SlidersHorizontal size={14} />
          Filters
        </button>
        {hasFilters && (
          <motion.button
            type="button"
            onClick={onClear}
            className="btn btn-ghost"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <X size={14} />
            Clear
          </motion.button>
        )}
      </form>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            className="advanced-filters glass"
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: "auto", marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="filter-row">
              <div className="filter-group">
                <label>File Type</label>
                <select
                  value={filters.mimeType}
                  onChange={(e) =>
                    setFilters({ ...filters, mimeType: e.target.value })
                  }
                >
                  <option value="">All Types</option>
                  <option value="image/jpeg">Images (JPEG)</option>
                  <option value="image/png">Images (PNG)</option>
                  <option value="application/pdf">PDF</option>
                  <option value="text/plain">Text</option>
                  <option value="application/zip">ZIP</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Min Size (bytes)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={filters.minSize}
                  onChange={(e) =>
                    setFilters({ ...filters, minSize: e.target.value })
                  }
                />
              </div>
              <div className="filter-group">
                <label>Max Size (bytes)</label>
                <input
                  type="number"
                  placeholder="∞"
                  value={filters.maxSize}
                  onChange={(e) =>
                    setFilters({ ...filters, maxSize: e.target.value })
                  }
                />
              </div>
              <div className="filter-group">
                <label>From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) =>
                    setFilters({ ...filters, dateFrom: e.target.value })
                  }
                />
              </div>
              <div className="filter-group">
                <label>To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) =>
                    setFilters({ ...filters, dateTo: e.target.value })
                  }
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default SearchBar;
