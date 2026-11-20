import "server-only";
import { createRouter } from "./api-router";
import * as catalog from "./handlers/catalog";
import * as users from "./handlers/users";
import * as content from "./handlers/content";
import * as orders from "./handlers/orders";
import * as payments from "./handlers/payments";

// Access levels:
//   public — anyone
//   user   — a signed-in shopper or an admin (handlers also check the record is theirs)
//   admin  — the admin token from /api/admin/login

/**
 * Served at BOTH /api/users/* and /api/admin/* — the old Express app mounted the same
 * router on both prefixes and the UI uses them interchangeably.
 */
export const userRouter = createRouter([
  ["POST",   "/banner",                            "admin",  catalog.addBanner],
  ["GET",    "/banner",                            "public", catalog.getBanner],
  ["DELETE", "/banner/:bannerId",                  "admin",  catalog.deleteBanner],

  ["POST",   "/occasion/title",                    "admin",  catalog.addOrUpdateTitle],
  ["GET",    "/occasion/title",                    "public", catalog.getTitle],
  ["DELETE", "/occasion/title/:titleId",           "admin",  catalog.deleteTitle],

  ["POST",   "/occasion/category",                 "admin",  catalog.addOrUpdateOccCategory],
  ["GET",    "/occasion/category",                 "public", catalog.getOccCategory],
  ["DELETE", "/occasion/category/:OccCategoryId",  "admin",  catalog.deleteOccCategory],

  ["POST",   "/product/category",                  "admin",  catalog.addOrUpdateProCategory],
  ["POST",   "/product/category/:id",              "admin",  catalog.addOrUpdateProCategory],
  ["GET",    "/product/category",                  "public", catalog.getProCategory],
  ["GET",    "/product/category/single/:id",       "public", catalog.getProCategoryById],
  ["DELETE", "/product/category/:ProCategoryId",   "admin",  catalog.deleteProCategory],

  ["POST",   "/productManagement/size",            "admin",  catalog.sizes.add],
  ["PUT",    "/productManagement/size",            "admin",  catalog.sizes.update],
  ["GET",    "/productManagement/size",            "public", catalog.sizes.list],
  ["DELETE", "/productManagement/size/:id",        "admin",  catalog.sizes.remove],

  ["POST",   "/productManagement/color",           "admin",  catalog.colors.add],
  ["GET",    "/productManagement/color",           "public", catalog.colors.list],
  ["PUT",    "/productManagement/color",           "admin",  catalog.colors.update],
  ["DELETE", "/productManagement/color/:id",       "admin",  catalog.colors.remove],

  ["POST",   "/productManagement/fabric",          "admin",  catalog.fabrics.add],
  ["GET",    "/productManagement/fabric",          "public", catalog.fabrics.list],
  ["PUT",    "/productManagement/fabric",          "admin",  catalog.fabrics.update],
  ["DELETE", "/productManagement/fabric/:id",      "admin",  catalog.fabrics.remove],

  ["POST",   "/productManagement/tag",             "admin",  catalog.tags.add],
  ["GET",    "/productManagement/tag",             "public", catalog.tags.list],
  ["PUT",    "/productManagement/tag/:id",         "admin",  catalog.tags.update],
  ["DELETE", "/productManagement/tag/:id",         "admin",  catalog.tags.remove],

  ["POST",   "/occasion/product",                  "admin",  catalog.addOrUpdateOccasionProduct],
  ["GET",    "/occasion/product",                  "public", catalog.getAllProductsFromAllOccasionCategories],

  ["POST",   "/category/product",                  "admin",  catalog.addOrUpdateProductInCategory],
  ["GET",    "/category/product",                  "public", catalog.getAllProductsFromAllCategories],
  ["GET",    "/category/product/:id",              "public", catalog.getProductByID],
  ["DELETE", "/category/product/:id",              "admin",  catalog.deleteProduct],

  ["POST",   "/update/occasion/stock",             "admin",  catalog.updateOccasionStock],
  ["POST",   "/update/category/stock",             "admin",  catalog.updateCategoryStock],

  ["GET",    "/products/stock",                    "admin",  catalog.getProductsWithStock],
  ["GET",    "/products/:productId/stock",         "admin",  catalog.getProductStock],
  ["POST",   "/products/:productId/stock",         "admin",  catalog.updateStock],
  ["GET",    "/products/:productId/stock-history", "admin",  catalog.getStockHistory],

  ["POST",   "/auth/request-otp",                  "public", users.reqOTP],
  ["POST",   "/auth/verify-otp",                   "public", users.verifyOTP],
  ["POST",   "/user/update",                       "user",   users.updateUser],

  ["GET",    "/user/:id",                          "user",   users.getUser],
  ["POST",   "/update/user",                       "user",   users.updateUser],
  ["GET",    "/getAllusers",                       "admin",  users.getAllUsers],

  ["POST",   "/cart/add",                          "user",   users.addToCart],
  ["POST",   "/cart/remove",                       "user",   users.removeFromCart],
  ["GET",    "/cart/abandoned",                    "admin",  users.abandonedCart],

  ["POST",   "/login",                             "public", users.adminLogin],
  ["POST",   "/update",                            "admin",  users.adminUpdate],
  ["POST",   "/details",                           "admin",  users.adminDetails],

  ["GET",    "/category/:categoryId",              "public", catalog.getCategoryProducts],
  ["GET",    "/occasion/category/:categoryId",     "public", catalog.getOccCategoryProducts],

  ["POST",   "/subcategory",                       "admin",  catalog.createSubcategory],
  ["GET",    "/subcategory",                       "public", catalog.getAllSubcategories],
  ["GET",    "/subcategory/:id",                   "public", catalog.getSubcategoryById],
  ["PUT",    "/subcategory/:id",                   "admin",  catalog.updateSubcategory],
  ["DELETE", "/subcategory/:id",                   "admin",  catalog.deleteSubcategory],

  ["POST",   "/contactus",                         "public", content.createContactUs],
  ["GET",    "/contactus",                         "admin",  content.getAllContacts],

  ["POST",   "/contact",                           "admin",  content.createContact],
  ["GET",    "/contact",                           "public", content.getContact],
  ["PUT",    "/contact/:id",                       "admin",  content.updateContact],

  ["PUT",    "/category/product/:productId/status","admin",  catalog.updateProductStatus],
]);

/** /api/orders/* */
export const orderRouter = createRouter([
  ["POST", "/createOrder",               "user",  orders.createOrder],
  ["GET",  "/getAllOrders",              "user",  orders.getAllOrders],
  ["GET",  "/:id",                       "user",  orders.getOrderById],
  ["GET",  "/user/:userId",              "user",  orders.getUserOrders],
  ["PUT",  "/:orderId/status",           "admin", orders.updateOrderStatus],
  ["PUT",  "/:orderId/payment-status",   "admin", orders.updatePaymentStatus],
]);

/** /api/user/* (PhonePe) */
export const paymentRouter = createRouter([
  ["POST", "/addpaymentphonepay",         "user",   payments.addPaymentPhone],
  ["PUT",  "/updateStatuspayment/:id",    "admin",  payments.updateStatusPayment],
  ["GET",  "/getallpayment",              "admin",  payments.getAllPayments],
  ["POST", "/payment-callback",           "public", payments.paymentCallback],
  ["GET",  "/checkPayment/:id/:userId",   "user",   payments.checkPayment],
]);
