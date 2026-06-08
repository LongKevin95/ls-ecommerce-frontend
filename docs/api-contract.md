# Frontend - Backend API Contract

Tài liệu này chuẩn hóa contract giữa frontend mới và backend Express/MongoDB sẽ làm sau.

## 1. Nguyên tắc chung

- Base URL dùng từ `VITE_API_BASE_URL`
- Response lỗi nên thống nhất format:

```json
{
  "message": "Human readable error message"
}
```

- Với route cần đăng nhập, gửi header:

```http
Authorization: Bearer <accessToken>
```

- Backend nên trả dữ liệu đã chuẩn hóa, hạn chế để frontend phải normalize sâu.

## 2. Shared models

### 2.1 User

```json
{
  "id": "u-123",
  "name": "Long Customer",
  "email": "customer@ls.com",
  "roles": ["customer"],
  "status": "active",
  "avatarUrl": "",
  "phone": "0900000002",
  "address": "District 1",
  "bio": "",
  "shop": null
}
```

### 2.2 Vendor user

```json
{
  "id": "u-vendor-1",
  "name": "Vendor Demo",
  "email": "vendor@ls.com",
  "roles": ["vendor"],
  "status": "active",
  "avatarUrl": "",
  "phone": "0900000003",
  "address": "District 7",
  "bio": "Demo vendor",
  "shop": {
    "id": "shop-1",
    "name": "Vendor Demo Shop",
    "slug": "vendor-demo-shop"
  }
}
```

### 2.3 Product

```json
{
  "id": "p-1",
  "title": "Gaming Headphone",
  "slug": "gaming-headphone",
  "category": "electronics",
  "description": "Comfortable headphone for daily gaming.",
  "price": 120,
  "oldPrice": 150,
  "stock": 8,
  "thumbnail": "https://...",
  "gallery": ["https://..."],
  "status": "active",
  "vendorId": "u-vendor-1",
  "shopId": "shop-1",
  "shopName": "Vendor Demo Shop",
  "createdAt": "2026-06-04T09:00:00.000Z",
  "updatedAt": "2026-06-04T09:00:00.000Z"
}
```

### 2.4 Order

```json
{
  "id": "order-1",
  "customerId": "u-customer-1",
  "status": "pending",
  "paymentMethod": "cod",
  "shippingAddress": {
    "fullName": "Long Customer",
    "phone": "0900000002",
    "address": "District 1",
    "city": "HCM City",
    "state": "HCM",
    "zipCode": "700000",
    "country": "Vietnam"
  },
  "items": [
    {
      "productId": "p-1",
      "quantity": 1,
      "color": "Black",
      "size": "Default"
    }
  ],
  "total": 120,
  "createdAt": "2026-06-04T09:00:00.000Z",
  "updatedAt": "2026-06-04T09:00:00.000Z"
}
```

## 3. Enum chuẩn

### 3.1 Roles

- `customer`
- `vendor`
- `admin`

### 3.2 Product status

- `draft`
- `pending`
- `active`
- `inactive`
- `rejected`

### 3.3 Order status

- `pending`
- `confirmed`
- `processing`
- `completed`
- `cancelled`

### 3.4 Payment method

- `cod`
- `card`

## 4. Auth APIs

### 4.1 POST `/auth/login`

Đăng nhập.

Request:

```json
{
  "email": "customer@ls.com",
  "password": "123456"
}
```

Response `200`:

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "u-customer-1",
    "name": "Long Customer",
    "email": "customer@ls.com",
    "roles": ["customer"],
    "status": "active",
    "avatarUrl": "",
    "phone": "0900000002",
    "address": "District 1",
    "bio": "",
    "shop": null
  }
}
```

### 4.2 POST `/auth/register`

Tạo customer account mới.

Request:

```json
{
  "name": "New User",
  "email": "new@ls.com",
  "password": "123456"
}
```

Response `201`:

```json
{
  "accessToken": "jwt-access-token",
  "user": {
    "id": "u-999",
    "name": "New User",
    "email": "new@ls.com",
    "roles": ["customer"],
    "status": "active",
    "avatarUrl": "",
    "phone": "",
    "address": "",
    "bio": "",
    "shop": null
  }
}
```

### 4.3 GET `/auth/me`

Lấy session hiện tại.

Response `200`:

```json
{
  "user": {
    "id": "u-customer-1",
    "name": "Long Customer",
    "email": "customer@ls.com",
    "roles": ["customer"],
    "status": "active",
    "avatarUrl": "",
    "phone": "0900000002",
    "address": "District 1",
    "bio": "",
    "shop": null
  }
}
```

## 5. User APIs

### 5.1 PATCH `/users/me`

Update profile người dùng đang đăng nhập.

Request:

```json
{
  "name": "Long Updated",
  "phone": "0909999999",
  "avatarUrl": "",
  "address": "District 3",
  "bio": "Updated bio"
}
```

Response `200`:

```json
{
  "id": "u-customer-1",
  "name": "Long Updated",
  "email": "customer@ls.com",
  "roles": ["customer"],
  "status": "active",
  "avatarUrl": "",
  "phone": "0909999999",
  "address": "District 3",
  "bio": "Updated bio",
  "shop": null
}
```

### 5.2 GET `/users`

Dùng cho admin hoặc internal dashboard.

Query khuyến nghị:

- `role=customer|vendor|admin`
- `status=active|banned|rejected`
- `search=<keyword>`

Response `200`:

```json
[
  {
    "id": "u-customer-1",
    "name": "Long Customer",
    "email": "customer@ls.com",
    "roles": ["customer"],
    "status": "active",
    "avatarUrl": "",
    "phone": "0900000002",
    "address": "District 1",
    "bio": "",
    "shop": null
  }
]
```

### 5.3 GET `/users/:id`

Lấy chi tiết 1 user.

Response `200`:

```json
{
  "id": "u-vendor-1",
  "name": "Vendor Demo",
  "email": "vendor@ls.com",
  "roles": ["vendor"],
  "status": "active",
  "avatarUrl": "",
  "phone": "0900000003",
  "address": "District 7",
  "bio": "Demo vendor",
  "shop": {
    "id": "shop-1",
    "name": "Vendor Demo Shop",
    "slug": "vendor-demo-shop"
  }
}
```

## 6. Product APIs

### 6.1 GET `/products`

Public products list.

Query khuyến nghị:

- `status=active`
- `category=<slug>`
- `search=<keyword>`
- `vendorId=<id>`

Response `200`:

```json
[
  {
    "id": "p-1",
    "title": "Gaming Headphone",
    "slug": "gaming-headphone",
    "category": "electronics",
    "description": "Comfortable headphone for daily gaming.",
    "price": 120,
    "oldPrice": 150,
    "stock": 8,
    "thumbnail": "https://...",
    "gallery": ["https://..."],
    "status": "active",
    "vendorId": "u-vendor-1",
    "shopId": "shop-1",
    "shopName": "Vendor Demo Shop",
    "createdAt": "2026-06-04T09:00:00.000Z",
    "updatedAt": "2026-06-04T09:00:00.000Z"
  }
]
```

### 6.2 GET `/products/:id`

Lấy chi tiết 1 sản phẩm.

### 6.3 GET `/vendor/products/me`

Danh sách sản phẩm của vendor đang đăng nhập.

Response `200`: mảng `Product[]`

### 6.4 POST `/vendor/products`

Vendor tạo sản phẩm mới.

Request:

```json
{
  "title": "Desk Lamp Minimal",
  "category": "home",
  "description": "Draft product used for vendor/admin management demo.",
  "price": 45,
  "oldPrice": 59,
  "stock": 4,
  "thumbnail": "https://..."
}
```

Response `201`:

```json
{
  "id": "p-3",
  "title": "Desk Lamp Minimal",
  "slug": "desk-lamp-minimal",
  "category": "home",
  "description": "Draft product used for vendor/admin management demo.",
  "price": 45,
  "oldPrice": 59,
  "stock": 4,
  "thumbnail": "https://...",
  "gallery": ["https://..."],
  "status": "draft",
  "vendorId": "u-vendor-1",
  "shopId": "shop-1",
  "shopName": "Vendor Demo Shop",
  "createdAt": "2026-06-04T09:00:00.000Z",
  "updatedAt": "2026-06-04T09:00:00.000Z"
}
```

### 6.5 PATCH `/vendor/products/:id`

Vendor sửa sản phẩm của chính mình.

Request ví dụ:

```json
{
  "title": "Desk Lamp Minimal v2",
  "price": 49,
  "stock": 6,
  "thumbnail": "https://..."
}
```

Response `200`: `Product`

### 6.6 PATCH `/vendor/products/:id/status`

Vendor đổi trạng thái sản phẩm của mình.

Request:

```json
{
  "status": "pending"
}
```

Cho phép tối thiểu:

- `draft`
- `pending`
- `inactive`

Response `200`: `Product`

### 6.7 DELETE `/vendor/products/:id`

Vendor xóa sản phẩm của chính mình.

Response `200`:

```json
{
  "message": "Product deleted successfully"
}
```

### 6.8 GET `/admin/products`

Admin xem toàn bộ sản phẩm.

Query khuyến nghị:

- `status=draft|pending|active|inactive|rejected`
- `vendorId=<id>`
- `search=<keyword>`

Response `200`: mảng `Product[]`

### 6.9 PATCH `/admin/products/:id/status`

Admin duyệt sản phẩm.

Request:

```json
{
  "status": "active"
}
```

Cho phép tối thiểu:

- `active`
- `inactive`
- `rejected`

Response `200`: `Product`

## 7. Order APIs

### 7.1 POST `/orders`

Tạo order từ checkout.

Request tối thiểu:

```json
{
  "customerId": "u-customer-1",
  "paymentMethod": "cod",
  "shippingAddress": {
    "fullName": "Long Customer",
    "phone": "0900000002",
    "address": "District 1",
    "city": "HCM City",
    "state": "HCM",
    "zipCode": "700000",
    "country": "Vietnam"
  },
  "items": [
    {
      "productId": "p-1",
      "quantity": 1,
      "color": "Black",
      "size": "Default"
    }
  ]
}
```

Response `201`: `Order`

Lưu ý backend:

- validate `customerId`
- validate product tồn tại
- validate stock đủ
- trừ stock trong transaction nếu dùng MongoDB session
- tự tính `total` ở backend, frontend không nên là source of truth

### 7.2 GET `/orders/me`

Customer xem order của chính mình.

Response `200`: mảng `Order[]`

### 7.3 GET `/vendor/orders`

Vendor xem order có item thuộc về shop/vendor hiện tại.

Response `200`:

```json
[
  {
    "id": "order-2",
    "customerId": "u-customer-1",
    "status": "processing",
    "paymentMethod": "card",
    "shippingAddress": {
      "fullName": "Long Customer",
      "phone": "0900000002",
      "address": "District 1",
      "city": "HCM City",
      "state": "HCM",
      "zipCode": "700000",
      "country": "Vietnam"
    },
    "items": [
      {
        "productId": "p-2",
        "quantity": 1,
        "color": "Gray",
        "size": "Default"
      }
    ],
    "vendorItems": [
      {
        "productId": "p-2",
        "quantity": 1,
        "color": "Gray",
        "size": "Default"
      }
    ],
    "total": 80,
    "createdAt": "2026-06-04T09:00:00.000Z",
    "updatedAt": "2026-06-04T09:00:00.000Z"
  }
]
```

### 7.4 PATCH `/vendor/orders/:id/status`

Vendor cập nhật trạng thái order liên quan tới shop của mình.

Request:

```json
{
  "status": "processing"
}
```

Cho phép tối thiểu:

- `processing`
- `completed`
- `cancelled`

Response `200`: `Order`

### 7.5 GET `/admin/orders`

Admin xem toàn bộ order.

Query khuyến nghị:

- `status=pending|processing|completed|cancelled`
- `customerId=<id>`

Response `200`: mảng `Order[]`

### 7.6 PATCH `/admin/orders/:id/status`

Admin cập nhật trạng thái order.

Request:

```json
{
  "status": "completed"
}
```

Response `200`: `Order`

## 8. Mapping frontend service -> backend endpoint

- `loginWithCredentials` -> `POST /auth/login`
- `registerUser` -> `POST /auth/register`
- `updateUserProfile` -> `PATCH /users/me`
- `getUsers` -> `GET /users`
- `getUserById` -> `GET /users/:id`
- `getProducts` -> `GET /products`
- `getProductById` -> `GET /products/:id`
- `getProductsByVendorId` -> `GET /vendor/products/me`
- `createVendorProduct` -> `POST /vendor/products`
- `updateProductById` ->
  - vendor flow: `PATCH /vendor/products/:id`
  - admin status flow: `PATCH /admin/products/:id/status`
- `deleteProductById` -> `DELETE /vendor/products/:id`
- `createOrder` -> `POST /orders`
- `getOrdersByCustomerId` -> `GET /orders/me`
- `getAllOrders` -> `GET /admin/orders`
- `getVendorOrders` -> `GET /vendor/orders`
- `updateOrderStatus` ->
  - vendor flow: `PATCH /vendor/orders/:id/status`
  - admin flow: `PATCH /admin/orders/:id/status`

## 9. Gợi ý auth/authorization ở backend

- `customer`
  - checkout
  - xem order của mình
  - cập nhật profile của mình

- `vendor`
  - CRUD sản phẩm của chính mình
  - submit sản phẩm sang `pending`
  - xem order liên quan tới shop của mình
  - cập nhật trạng thái order vendor được phép xử lý

- `admin`
  - xem toàn bộ users/products/orders
  - duyệt sản phẩm
  - đổi trạng thái order toàn hệ thống

## 10. Các điểm nên giữ ở backend thay vì frontend

- Hash password bằng `bcrypt`
- Ký access token bằng `jsonwebtoken`
- Validate quyền bằng middleware auth/authorization
- Tự tính `total` order ở backend
- Validate stock ở backend
- Quy định chuyển trạng thái order/product ở backend
- Shop là entity riêng hoặc ít nhất là subdocument rõ ràng của vendor, không derive động từ product ở frontend
