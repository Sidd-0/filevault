#!/bin/bash 
echo "Starting FileVault..." 
cd .. 
cd backend 
go run main.go upload.go list.go delete.go 
