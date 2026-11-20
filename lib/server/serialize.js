import "server-only";

// Postgres rows -> the JSON shapes the old Mongoose API returned. The UI reads these
// field names directly (`_id`, `Category`, `offerPrice`, `stockBySize`, ...), so each
// mapper below is effectively the API contract for that resource.

const ref = (row, mapper, id) => (row ? mapper(row) : id ?? null);

export const banner = (r) => ({
  _id: r.id,
  image: r.image,
  imageLink: r.image_link,
  couponCode: r.coupon_code,
  createdAt: r.created_at,
});

export const occasionTitle = (r) => ({
  _id: r.id,
  title: r.title,
  subtitle: r.subtitle,
  categories: (r.occasion_categories ?? []).map(occasionCategory),
  createdAt: r.created_at,
});

export const occasionCategory = (r) => ({
  _id: r.id,
  image: r.image,
  OccCategory: r.name,
  Occasion: ref(r.occasion_titles, occasionTitle, r.occasion_id),
  products: (r.occasion_products ?? []).map(occasionProduct),
  createdAt: r.created_at,
});

export const occasionProduct = (r) => ({
  _id: r.id,
  name: r.name,
  mrp: r.mrp,
  discount: r.discount,
  offerPrice: r.offer_price,
  category: r.category,
  sizeChart: r.size_chart,
  images: r.images ?? [],
  tag: r.tag,
  color: r.colors ?? [],
  fabric: r.fabric,
  size: r.sizes ?? [],
  description: r.description,
  additionalInfo: r.additional_info,
  status: r.status,
  stocks: r.stocks,
  Minstocks: r.min_stocks,
  occasionCategory: ref(r.occasion_categories, occasionCategory, r.occasion_category_id),
  stockHistory: r.stock_history ?? [],
  createdAt: r.created_at,
});

export const productCategory = (r) => ({
  _id: r.id,
  image: r.image,
  Category: r.name,
  Description: r.description,
  products: (r.category_products ?? []).map(categoryProduct),
  subcategories: (r.product_subcategories ?? []).map(subcategory),
  createdAt: r.created_at,
});

export const subcategory = (r) => ({
  _id: r.id,
  name: r.name,
  description: r.description,
  image: r.image,
  parentCategory: r.product_categories
    ? { _id: r.product_categories.id, Category: r.product_categories.name, image: r.product_categories.image }
    : r.parent_category_id,
  products: (r.category_products ?? []).map(categoryProduct),
  createdAt: r.created_at,
});

export const stockEntry = (r) => ({
  _id: `${r.product_id}:${r.size}`,
  size: r.size,
  quantity: r.quantity,
  minQuantity: r.min_quantity,
});

export const stockHistoryEntry = (r) => ({
  _id: r.id,
  size: r.size,
  stockName: r.stock_name,
  addedStock: r.added_stock,
  previousStock: r.previous_stock,
  addedAt: r.added_at,
});

export const categoryProduct = (r) => ({
  _id: r.id,
  name: r.name,
  mrp: r.mrp,
  discount: r.discount,
  offerPrice: r.offer_price,
  category: r.category,
  sizeChart: r.size_chart,
  images: r.images ?? [],
  tag: r.tag,
  color: r.colors ?? [],
  fabric: r.fabric,
  availableSizes: r.available_sizes ?? [],
  stockBySize: sortBySizes(r.product_size_stock ?? [], r.available_sizes).map(stockEntry),
  description: r.description,
  additionalInfo: r.additional_info,
  Minstocks: r.min_stocks,
  status: r.status,
  productCategory: r.product_category_id,
  subcategory: r.subcategory_id,
  stockHistory: (r.product_stock_history ?? []).map(stockHistoryEntry),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function sortBySizes(rows, sizes = []) {
  const order = new Map((sizes ?? []).map((s, i) => [s, i]));
  return [...rows].sort((a, b) => (order.get(a.size) ?? 999) - (order.get(b.size) ?? 999));
}

const lookup = (field) => (r) => ({ _id: r.id, [field]: r.name, createdAt: r.created_at });
export const size = lookup("Size");
export const color = lookup("Color");
export const fabric = lookup("Fabric");
export const tag = lookup("Tag");

export const cartItem = (r) => ({
  _id: r.id,
  productId: ref(r.category_products, categoryProduct, r.product_id),
  quantity: r.quantity,
  size: r.size,
  addedAt: r.added_at,
});

export const user = (r, { dobParts = false } = {}) => ({
  _id: r.id,
  phoneNumber: r.phone_number,
  firstName: r.first_name,
  lastName: r.last_name,
  email: r.email,
  dob: dobParts ? splitDob(r.dob) : r.dob,
  gender: r.gender,
  address: r.address,
  cart: (r.cart_items ?? []).map(cartItem),
  wishlist: [],
  recentlyViewed: [],
  orders: [],
  shippingDetails: r.shipping_details ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function splitDob(dob) {
  if (!dob) return null;
  const [year, month, day] = String(dob).slice(0, 10).split("-").map(Number);
  return { day, month, year };
}

export const orderUser = (r) => ({
  _id: r.id,
  firstName: r.first_name,
  lastName: r.last_name,
  phoneNumber: r.phone_number,
  email: r.email,
});

export const order = (r) => ({
  _id: r.id,
  user: ref(r.users, orderUser, r.user_id),
  items: (r.items ?? []).map((item, i) => ({ _id: `${r.id}:${i}`, ...item })),
  shippingAddress: r.shipping_address,
  paymentMethod: r.payment_method,
  couponCode: r.coupon_code,
  subtotal: r.subtotal,
  tax: r.tax,
  shippingCharge: r.shipping_charge,
  discount: r.discount,
  total: r.total,
  status: r.status,
  paymentStatus: r.payment_status,
  trackingNumber: r.tracking_number,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const transaction = (r) => ({
  _id: r.id,
  userId: r.user_id,
  username: r.username,
  Mobile: r.mobile,
  orderId: r.order_ref,
  amount: r.amount,
  transactionid: r.transaction_id,
  transactionStatus: r.transaction_status,
  successUrl: r.success_url,
  failedUrl: r.failed_url,
  status: r.status,
  createdOrderId: r.order_id,
  orderError: r.order_error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const contactInfo = (r) => ({
  _id: r.id,
  address: r.address,
  mobile: r.mobile,
  email: r.email,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const contactMessage = (r) => ({
  _id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  message: r.message,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const admin = (r) => ({
  _id: r.id,
  email: r.email,
  phone: r.phone,
  address: r.address,
  socialMedia: r.social_media ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});
