# Architecture Summary

## Modules

The project is organized into several modules, each responsible for a specific domain. The core modules identified are:

- **Auth**: Handles user authentication, registration, login (including Google login), profile management, and password changes.
- **Addresses**: Manages user addresses.
- **Brands**: Manages product brands.
- **Cart**: Manages user shopping carts and cart items.
- **Categories**: Manages product categories.
- **Coupons**: Manages discount coupons.
- **Orders**: Handles the order placement process, order retrieval, and order cancellation.
- **Payments**: Manages payment processing and status.
- **Products**: Manages product information.
- **Product Variants**: (Mentioned in `PROJECT_CONTEXT.md` but directory is empty, likely handled within `Products` module).
- **Product Images**: Manages product images.
- **Reviews**: Manages product reviews.
- **Roles**: Manages user roles (ADMIN, STAFF, CUSTOMER).
- **Users**: Manages user details.
- **Chat**: (Empty directory, likely a placeholder or future feature).
- **Dashboard**: (Empty directory, likely a placeholder or future feature).
- **Import**: (Empty directory, likely a placeholder or future feature).
- **Inventory**: (Empty directory, likely a placeholder or future feature).

## Database Tables

The application uses an MSSQL database with the following tables:

- `Roles`: Stores user roles (e.g., ADMIN, STAFF, CUSTOMER).
- `Users`: Stores user information, including authentication credentials and role.
- `Categories`: Stores product categories.
- `Brands`: Stores product brands.
- `Products`: Stores product details.
- `ProductImages`: Stores images associated with products.
- `ProductVariants`: Stores different variants of products (e.g., size, color, material) and their stock quantities.
- `Addresses`: Stores user delivery addresses.
- `Cart`: Stores user cart information.
- `CartItems`: Stores items within a user's cart.
- `Coupons`: Stores discount coupon details.
- `Orders`: Stores order information.
- `OrderDetails`: Stores details of items within an order.
- `Payments`: Stores payment transaction details.
- `Reviews`: Stores product reviews.
- `InventoryTransactions`: Records inventory movements (e.g., IMPORT, EXPORT, RETURN, CANCEL).

## Database Relationships

- `Users` to `Roles`: Many-to-one (a user has one role, a role can have many users).
- `Orders` to `Users`: Many-to-one (an order belongs to one user, a user can have many orders).
- `Orders` to `Addresses`: Many-to-one (an order is associated with one address).
- `Orders` to `Coupons`: Many-to-one (an order can have one coupon, a coupon can be used in many orders).
- `OrderDetails` to `Orders`: Many-to-one (order details belong to one order).
- `OrderDetails` to `ProductVariants`: Many-to-one (order details refer to a specific product variant).
- `Cart` to `Users`: One-to-one (a user has one cart).
- `CartItems` to `Cart`: Many-to-one (cart items belong to one cart).
- `CartItems` to `ProductVariants`: Many-to-one (cart items refer to a specific product variant).
- `ProductImages` to `Products`: Many-to-one (product images belong to one product).
- `ProductVariants` to `Products`: Many-to-one (product variants belong to one product).
- `Reviews` to `Users`: Many-to-one (a review is made by one user).
- `Reviews` to `Products`: Many-to-one (a review is for one product).
- `InventoryTransactions` to `ProductVariants`: Many-to-one (an inventory transaction is for a specific product variant).
- `Payments` to `Orders`: One-to-one (a payment is for one order).

## Authentication Flow

1. **User Registration**: Users can register with their full name, email, and password. A new user is assigned the `CUSTOMER` role by default.
2. **User Login**: Users can log in with their email and password. The system verifies credentials and checks if the account is active. Upon successful login, a JSON Web Token (JWT) is generated and returned for subsequent authenticated requests.
3. **Admin/Staff Login**: Similar to user login, but with an additional check to ensure the user has either `ADMIN` or `STAFF` roles.
4. **Google Login**: Users can log in using their Google account. The system verifies the Google ID token. If the user does not exist, a new account is created with the `CUSTOMER` role, using information from their Google profile. An access token is then generated.
5. **Logout**: Users can log out, which invalidates their access token by adding it to a token blacklist.
6. **Profile Management**: Authenticated users can view and update their profile information (full name, phone, avatar) and change their password.

## Order Workflow

1. **Checkout Initiation**: A user initiates checkout by providing a selected address, optional coupon code, desired payment method (COD or VNPAY), and IP address.
2. **Address Validation**: The system verifies that the selected address belongs to the user.
3. **Cart Retrieval**: The user's shopping cart and its items are retrieved. If the cart is empty, checkout is prevented.
4. **Stock Validation**: The system checks if there is sufficient stock for all items in the cart.
5. **Subtotal Calculation**: The total price of all items in the cart is calculated.
6. **Shipping Fee Calculation**: An external API (Giaohangtietkiem.vn) is called to calculate the shipping fee based on the delivery address, total weight, and value of the order.
7. **Coupon Application**: If a coupon code is provided, it is validated for existence, activity, validity period, usage limits, and minimum order value. A discount amount is calculated and applied.
8. **Final Amount Calculation**: The final order amount is calculated by subtracting the discount and adding the shipping fee to the subtotal.
9. **Order Creation**: A new order record is created in the `Orders` table with all relevant details, including a unique order code, user ID, address details, coupon ID (if applicable), amounts, payment method, and initial status (`Pending`).
10. **Payment URL Generation (VNPAY)**: If VNPAY is selected as the payment method, a payment URL is generated for the user to complete the transaction.
11. **Order Details Creation**: Each item from the cart is recorded as an `OrderDetail` associated with the new order.
12. **Inventory Update**: The stock quantity for each product variant in the order is decreased, and an `InventoryTransaction` of type `EXPORT` is recorded.
13. **Coupon Usage Update**: If a coupon was used, its usage quantity is decreased.
14. **Cart Clearance**: The user's shopping cart is cleared.
15. **Payment Record Creation**: A payment record is created in the `Payments` table with the order ID, final amount, and `Pending` status.
16. **Order Retrieval**: The newly created order, along with its details and payment information, is returned to the user.

## Payment Workflow

1. **Payment Method Selection**: During checkout, users can select either Cash on Delivery (COD) or VNPAY.
2. **COD**: For COD orders, the `payment_status` is initially set to `Pending` and no external payment gateway interaction occurs at the time of order creation.
3. **VNPAY**: For VNPAY orders, a payment URL is generated using the `vnpay.service.js` and returned to the user. The user is expected to redirect to this URL to complete the payment. The `payment_status` is initially set to `Pending`.
4. **Payment Record**: A record is created in the `Payments` table for every order, regardless of the payment method, with an initial `payment_status` of `Pending`.
5. **Payment Status Updates**: The system is expected to have mechanisms (e.g., webhooks from VNPAY) to update the `payment_status` in the `Payments` and `Orders` tables to `Paid`, `Failed`, or `Refunded`.

## Coding Conventions

- **Tech Stack**: NodeJS, ExpressJS, MSSQL, Knex.
- **Architecture**: Follows a modular structure with `validation.js`, `controller.js`, `service.js`, and `routes.js` files within each module.
- **Database Interaction**: Uses `knex` for SQL query building and execution.
- **Error Handling**: Custom `AppError` class is used for consistent error handling across the application.
- **Constants**: Centralized constants for roles, table names, order statuses, payment statuses, etc., defined in `config/constants.js`.
- **Utilities**: Common utility functions (e.g., password hashing, token blacklisting, pagination, order code generation, slug generation) are placed in the `utils` directory.
- **Environment Variables**: Configuration values are loaded from environment variables using `config/env.js`.
- **Response Format**: API responses follow a consistent JSON structure: `{ "success": true, "message": "", "data": {} }`.

## Completed Features (from PROJECT_CONTEXT.md and code analysis)

- Auth (User registration, login, Google login, profile management, password change, logout)
- Categories (CRUD operations inferred from module structure)
- Products (CRUD operations inferred from module structure)
- Product Variants (Management inferred from `Orders` and `Cart` modules, though `product-variants` directory is empty)
- Addresses (CRUD operations inferred from module structure and usage in `Orders`)
- Cart (Add to cart, view cart, checkout process)
- Coupons (Apply coupons during checkout, validation)
- Orders (Create order, view orders, view order details, cancel order)
- Payments (COD, VNPAY integration for payment URL generation)
- VNPay (Integration for payment processing)
- Shipping Fee (GHTK integration for calculation)

## Pending Features (inferred from empty directories or lack of explicit implementation)

- Chat (Empty module directory)
- Dashboard (Empty module directory)
- Import (Empty module directory)
- Inventory (Empty module directory, though `InventoryTransactions` table and related logic exist in `Orders` module, a dedicated module for inventory management might be pending)
- Reviews (Module directory exists, but `service.js` not yet analyzed for full functionality)
- Full Payment Status Update Mechanism (While VNPAY URL generation is present, the complete webhook or callback handling for updating payment statuses to `Paid`, `Failed`, `Refunded` needs further investigation or might be pending).
