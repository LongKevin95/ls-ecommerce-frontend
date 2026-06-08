# L&S Ecommerce Frontend Clean Baseline

Project này là frontend mới được dựng lại để chuẩn bị cho backend integration.

## Mục tiêu

- Giảm coupling giữa UI và business logic
- Chuẩn hóa auth state để dễ chuyển sang JWT backend
- Cart chỉ lưu `productId`, `quantity`, `color`, `size`
- Wishlist chỉ lưu `productId`
- Checkout chỉ gửi payload tối thiểu
- Tách service layer để dễ thay mock bằng API thật

## Stack

- React
- Vite
- React Router
- TanStack Query
- Axios
- Zod
- CSS thường

## Chạy project

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## ENV

```env
VITE_API_BASE_URL=
```

## Cấu trúc chính

- `src/app/*`: route, page, layout cho runtime mới
- `src/providers/*`: auth, cart, wishlist providers
- `src/services/*`: nơi sẽ thay dần sang gọi backend thật
- `src/api/mockStore.js`: mock local store tạm thời
- `src/mocks/mockData.js`: seed data demo

## Tài liệu API contract

Xem chi tiết tại:

- [`docs/api-contract.md`](./docs/api-contract.md)

File này mô tả:

- request/response mẫu cho auth, users, products, orders
- enum chuẩn giữa frontend và backend
- mapping từ frontend service sang backend endpoint
- gợi ý authorization theo role

## Hướng chuyển sang backend thật

Khi bắt đầu làm Express backend, ưu tiên thay dần các file sau:

- `src/services/authService.js`
- `src/services/userService.js`
- `src/services/productService.js`
- `src/services/orderService.js`

## Ghi chú

Hiện tại app vẫn chạy bằng mock local store để hoàn thiện frontend trước. Khi backend sẵn sàng, frontend có thể đổi sang API thật mà không cần viết lại toàn bộ UI.