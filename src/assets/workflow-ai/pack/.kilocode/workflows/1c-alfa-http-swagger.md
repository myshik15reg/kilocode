# 1C (firm): HTTP service documentation in Swagger (`1c-alfa-http-swagger`)

## Purpose

Keep HTTP services discoverable and supportable through the approved Swagger publication flow.

## Source of truth

- Swagger documentation process: [`REG`](../sources/1c-alfa/reg.md#http-swagger)

## When to use

- adding a new HTTP service
- changing request or response contract
- changing route, parameters, auth, or examples

## Workflow

1. Register the service in the approved Swagger subsystem.
2. Fill in methods, parameters, payload rules, and response structure.
3. Use placeholders such as `<HOST>` in pack docs; do not hardcode environment URLs.
4. Regenerate or refresh published service info.
5. Verify that consumers can find the updated contract.

## Checklist

- endpoint documented
- methods and parameters documented
- auth requirements documented
- examples sanitized
- publication refreshed
