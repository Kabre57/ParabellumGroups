# Managed by scripts/deploy-blue-green.sh. Active color: blue.
upstream api_gateway_backend {
    zone api_gateway_backend 64k;
    server api-gateway-blue:3001 resolve;
}

upstream frontend_backend {
    zone frontend_backend 64k;
    server frontend-blue:3000 resolve;
}
