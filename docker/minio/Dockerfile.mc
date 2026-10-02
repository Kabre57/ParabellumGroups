ARG GO_IMAGE=golang:1.24-bookworm
FROM ${GO_IMAGE} AS build

ARG MC_VERSION=RELEASE.2025-08-13T08-35-41Z
RUN go install -v "github.com/minio/mc@${MC_VERSION}"

FROM debian:bookworm-slim
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY --from=build /go/bin/mc /usr/local/bin/mc
ENTRYPOINT ["mc"]
