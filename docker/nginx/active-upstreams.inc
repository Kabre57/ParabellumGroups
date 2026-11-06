# Managed by scripts/deploy-blue-green.sh. Active color: green.
upstream api_gateway_backend {
    zone api_gateway_backend 64k;
    server api-gateway-green:3001 resolve;
}

upstream frontend_backend {
    zone frontend_backend 64k;
    server frontend-green:3000 resolve;
}
