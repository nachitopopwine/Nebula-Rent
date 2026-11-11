.PHONY: proto test cover build run

proto:
	mkdir -p gen
	protoc --proto_path=proto \
	  --go_out=. --go_opt=module=github.com/nebula-rent/nebula-pilotos \
	  --go-grpc_out=. --go-grpc_opt=module=github.com/nebula-rent/nebula-pilotos \
	  proto/pilotos.proto

test: proto
	go test ./internal/... -race

cover: proto
	go test ./internal/... -coverprofile=coverage.out -covermode=atomic
	./scripts/check-coverage.sh coverage.out 60

build: proto
	CGO_ENABLED=0 go build -o bin/pilotos ./cmd/server

run: build
	./bin/pilotos
