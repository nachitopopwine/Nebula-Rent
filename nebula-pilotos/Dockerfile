# ---------- build ----------
FROM golang:1.24-alpine AS build
RUN apk add --no-cache protobuf protobuf-dev make \
 && go install google.golang.org/protobuf/cmd/protoc-gen-go@v1.35.1 \
 && go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@v1.5.1
WORKDIR /src
COPY go.mod go.sum* ./
COPY proto ./proto
COPY Makefile ./
RUN make proto
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/pilotos ./cmd/server

# ---------- runtime ----------
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/pilotos /pilotos
EXPOSE 50051
USER nonroot
ENTRYPOINT ["/pilotos"]
