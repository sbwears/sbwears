import "server-only";
import { db } from "../supabase";
import { HttpError, json, must, isUuid, uploadFile, uploadAll, num, csv } from "../http";
import * as S from "../serialize";

const PRODUCT_WITH_STOCK = "*, product_size_stock(*)";

/** Fetch one row by id; malformed ids behave like "not found", as findById did. */
async function findById(table, id, notFound, select = "*") {
  if (!isUuid(id)) throw new HttpError(404, { error: notFound });
  return must(await db().from(table).select(select).eq("id", id).maybeSingle(), notFound);
}

const offerPriceOf = (mrp, discount) => (discount > 0 ? mrp - mrp * (discount / 100) : mrp);

/**
 * Product forms send `sizeChart` and `image` fields. Use the names when present; fall back
 * to the old positional rule (first file = size chart) for clients that don't name them.
 * The old server was positional only, so editing just the photos turned photo #1 into
 * the size chart.
 */
async function uploadProductFiles(files) {
  const named = files.some((f) => ["sizeChart", "image", "images"].includes(f.field));
  const chartFile = named ? files.find((f) => f.field === "sizeChart") : files[0];
  const imageFiles = named ? files.filter((f) => f.field === "image" || f.field === "images") : files.slice(1);
  const [chart, images] = await Promise.all([chartFile ? uploadFile(chartFile) : null, uploadAll(imageFiles)]);
  return { chart, images };
}

// ------------------------------------------------------------------ banners

export async function addBanner({ body, files, query }) {
  const { imageLink, couponCode } = body;
  const { bannerId } = query;

  if (bannerId) {
    await findById("banners", bannerId, "Banner not found");
    const patch = {};
    if (imageLink) patch.image_link = imageLink;
    if (couponCode) patch.coupon_code = couponCode;
    if (files.length > 0) patch.image = await uploadFile(files[0]);
    const row = must(await db().from("banners").update(patch).eq("id", bannerId).select().single());
    return json({ message: "Banner updated successfully", banner: S.banner(row) });
  }

  if (files.length === 0 || !imageLink || !couponCode) {
    throw new HttpError(400, { error: "All fields are required for new banners" });
  }
  const image = await uploadFile(files[0]);
  const row = must(
    await db().from("banners").insert({ image, image_link: imageLink, coupon_code: couponCode }).select().single()
  );
  return json({ message: "Banner added successfully", banner: S.banner(row) }, 201);
}

export async function getBanner() {
  const rows = must(await db().from("banners").select().order("created_at"));
  return json(rows.map(S.banner));
}

export async function deleteBanner({ params }) {
  await findById("banners", params.bannerId, "Banner not found");
  must(await db().from("banners").delete().eq("id", params.bannerId));
  return json({ message: "Banner deleted successfully" });
}

// ------------------------------------------------------------------ occasion titles

async function assignCategoriesToTitle(titleId, categories) {
  const ids = [].concat(categories ?? []).filter(Boolean);
  if (ids.length === 0) return;
  if (!ids.every(isUuid)) throw new HttpError(400, { error: "One or more categories are invalid!" });
  const found = must(await db().from("occasion_categories").select("id").in("id", ids));
  if (found.length !== new Set(ids).size) throw new HttpError(400, { error: "One or more categories are invalid!" });
  must(await db().from("occasion_categories").update({ occasion_id: titleId }).in("id", ids));
}

export async function addOrUpdateTitle({ body }) {
  const { titleId, title, subtitle, categories } = body;
  if (!titleId && (!title || !subtitle)) {
    throw new HttpError(400, { error: "Title and Subtitle are required for new entries!" });
  }

  if (titleId) {
    await findById("occasion_titles", titleId, "Title not found!");
    const patch = {};
    if (title) patch.title = title;
    if (subtitle) patch.subtitle = subtitle;
    if (Object.keys(patch).length) must(await db().from("occasion_titles").update(patch).eq("id", titleId));
    await assignCategoriesToTitle(titleId, categories);
    const row = await findById("occasion_titles", titleId, "Title not found!", "*, occasion_categories(*)");
    return json({ message: "Title updated successfully!", title: S.occasionTitle(row) });
  }

  const row = must(await db().from("occasion_titles").insert({ title, subtitle }).select().single());
  await assignCategoriesToTitle(row.id, categories);
  const full = await findById("occasion_titles", row.id, "Title not found!", "*, occasion_categories(*)");
  return json({ message: "Title added successfully!", title: S.occasionTitle(full) }, 201);
}

export async function getTitle() {
  const rows = must(
    await db().from("occasion_titles").select("*, occasion_categories(*)").order("created_at")
  );
  return json(rows.map(S.occasionTitle));
}

export async function deleteTitle({ params }) {
  await findById("occasion_titles", params.titleId, "Title not found");
  must(await db().from("occasion_titles").delete().eq("id", params.titleId));
  return json({ message: "Title deleted successfully" });
}

// ------------------------------------------------------------------ occasion categories

export async function addOrUpdateOccCategory({ body, files }) {
  const { Occasion, OccCategory, OccCategoryId } = body;
  if (!Occasion || !OccCategory) {
    throw new HttpError(400, { error: "Occasion and Category are required!" });
  }
  await findById("occasion_titles", Occasion, "Occasion (Title) not found!");

  if (OccCategoryId) {
    await findById("occasion_categories", OccCategoryId, "Category not found!");
    const patch = { name: OccCategory };
    if (files.length > 0) patch.image = await uploadFile(files[0]);
    const row = must(
      await db().from("occasion_categories").update(patch).eq("id", OccCategoryId).select().single()
    );
    return json({ message: "Category updated successfully", category: S.occasionCategory(row) });
  }

  const image = files.length > 0 ? await uploadFile(files[0]) : null;
  const row = must(
    await db()
      .from("occasion_categories")
      .insert({ name: OccCategory, image, occasion_id: Occasion })
      .select()
      .single()
  );
  return json({ message: "Category added successfully", category: S.occasionCategory(row) }, 201);
}

export async function getOccCategory() {
  const rows = must(
    await db()
      .from("occasion_categories")
      .select("*, occasion_titles(*), occasion_products(*)")
      .order("created_at")
  );
  return json(rows.map(S.occasionCategory));
}

export async function deleteOccCategory({ params }) {
  await findById("occasion_categories", params.OccCategoryId, "Occasion Category not found");
  must(await db().from("occasion_categories").delete().eq("id", params.OccCategoryId));
  return json({ message: "Category deleted successfully" });
}

export async function getOccCategoryProducts({ params }) {
  const row = await findById(
    "occasion_categories",
    params.categoryId,
    "Product Category not found",
    "id, occasion_products(*)"
  );
  return json({
    message: "Products fetched successfully",
    products: (row.occasion_products ?? []).map(S.occasionProduct),
  });
}

// ------------------------------------------------------------------ occasion products

export async function addOrUpdateOccasionProduct({ body, files }) {
  const { productId, name, category, tag, color, fabric, size, description, additionalInfo, status, occasionCategory } =
    body;
  const mrp = num(body.mrp);
  const discount = num(body.discount, 0);
  const stocks = num(body.stocks);
  const minStocks = num(body.Minstocks);

  if (!productId && (!name || !mrp || !category || !stocks || files.length === 0)) {
    throw new HttpError(400, { message: "Missing required fields!" });
  }
  await findById("occasion_categories", occasionCategory, "Occasion Category not found!");

  if (productId) {
    const existing = await findById("occasion_products", productId, "Product not found!");
    const finalMrp = mrp ?? Number(existing.mrp);
    const finalDiscount = body.discount !== undefined ? discount : Number(existing.discount);
    const patch = {
      ...(name && { name }),
      ...(mrp && { mrp }),
      ...(body.discount !== undefined && { discount }),
      ...(category && { category }),
      ...(tag && { tag }),
      ...(color && { colors: csv(color) }),
      ...(fabric && { fabric }),
      ...(size && { sizes: csv(size) }),
      ...(description && { description }),
      ...(status !== undefined && status !== "" && { status: status === true || status === "true" || status === "active" }),
      ...(additionalInfo && { additional_info: additionalInfo }),
      ...(stocks !== undefined && { stocks }),
      ...(minStocks !== undefined && { min_stocks: minStocks }),
      occasion_category_id: occasionCategory,
      offer_price: offerPriceOf(finalMrp, finalDiscount),
    };
    if (files.length > 0) {
      const { chart, images } = await uploadProductFiles(files);
      patch.size_chart = chart || existing.size_chart;
      patch.images = [0, 1, 2, 3].map((i) => images[i] || existing.images?.[i]).filter(Boolean);
    }
    const row = must(await db().from("occasion_products").update(patch).eq("id", productId).select().single());
    return json({ message: "Product updated successfully!", product: S.occasionProduct(row) });
  }

  const { chart, images } = await uploadProductFiles(files);
  const row = must(
    await db()
      .from("occasion_products")
      .insert({
        name,
        mrp,
        discount,
        offer_price: offerPriceOf(mrp, discount),
        category,
        tag,
        colors: csv(color),
        fabric,
        sizes: csv(size),
        size_chart: chart,
        description,
        status: status === true || status === "true" || status === "active",
        additional_info: additionalInfo,
        stocks,
        min_stocks: minStocks ?? 0,
        images: images.slice(0, 4),
        occasion_category_id: occasionCategory,
      })
      .select()
      .single()
  );
  return json({ message: "Product added successfully!", product: S.occasionProduct(row) }, 201);
}

export async function getAllProductsFromAllOccasionCategories() {
  const rows = must(
    await db()
      .from("occasion_products")
      .select("*, occasion_categories(*, occasion_titles(id, title, subtitle))")
      .order("created_at")
  );
  if (rows.length === 0) throw new HttpError(404, { message: "No products found" });
  return json({ message: "All products fetched successfully", products: rows.map(S.occasionProduct) });
}

export async function updateOccasionStock({ body }) {
  const { occasionCategory, productId, stockName } = body;
  const addedStock = num(body.addedStock);
  await findById("occasion_categories", occasionCategory, "Occasion Category not found!");
  if (!productId) throw new HttpError(400, { message: "productId is required" });
  if (addedStock === undefined) throw new HttpError(400, { message: "addedStock must be a number" });

  const product = await findById("occasion_products", productId, "Product not found");
  const entry = { stockName, addedStock, previousStock: product.stocks, addedAt: new Date().toISOString() };
  const row = must(
    await db()
      .from("occasion_products")
      .update({ stocks: product.stocks + addedStock, stock_history: [...(product.stock_history ?? []), entry] })
      .eq("id", productId)
      .select()
      .single()
  );
  return json({ message: "Stock updated successfully", product: S.occasionProduct(row) });
}

// ------------------------------------------------------------------ product categories

export async function addOrUpdateProCategory({ body, files, params }) {
  const { Category, Description } = body;
  const categoryId = body.CategoryId || params.id;

  if (categoryId) {
    await findById("product_categories", categoryId, "Product Category not found");
    const patch = {};
    if (Category !== undefined) patch.name = Category;
    if (Description !== undefined) patch.description = Description;
    if (files.length > 0) patch.image = await uploadFile(files[0]);
    if (Object.keys(patch).length === 0) throw new HttpError(400, { error: "No fields provided for update" });
    const row = must(await db().from("product_categories").update(patch).eq("id", categoryId).select().single());
    return json({ message: "Product Category updated successfully", ProductCategory: S.productCategory(row) });
  }

  if (files.length === 0 || !Category || !Description) {
    throw new HttpError(400, { error: "All fields are required for adding a new category" });
  }
  const image = await uploadFile(files[0]);
  const row = must(
    await db().from("product_categories").insert({ name: Category, description: Description, image }).select().single()
  );
  return json({ message: "Product Category added successfully", ProductCategory: S.productCategory(row) }, 201);
}

export async function getProCategory() {
  const rows = must(
    await db()
      .from("product_categories")
      .select(`*, category_products(${PRODUCT_WITH_STOCK}), product_subcategories(*)`)
      .order("created_at")
  );
  return json(rows.map(S.productCategory));
}

export async function getProCategoryById({ params }) {
  if (!isUuid(params.id)) return json(null);
  const row = must(await db().from("product_categories").select().eq("id", params.id).maybeSingle());
  return json(row ? S.productCategory(row) : null);
}

export async function deleteProCategory({ params }) {
  await findById("product_categories", params.ProCategoryId, "Product Category not found");
  must(await db().from("product_categories").delete().eq("id", params.ProCategoryId));
  return json({ message: "Category deleted successfully" });
}

export async function getCategoryProducts({ params }) {
  const row = await findById(
    "product_categories",
    params.categoryId,
    "Product Category not found",
    `id, category_products(${PRODUCT_WITH_STOCK})`
  );
  return json({
    message: "Products fetched successfully",
    products: (row.category_products ?? []).map(S.categoryProduct),
  });
}

// ------------------------------------------------------------------ subcategories

const SUBCATEGORY_SELECT = `*, product_categories(id, name, image), category_products(${PRODUCT_WITH_STOCK})`;

export async function createSubcategory({ body, files }) {
  const { name, description, parentCategory } = body;
  await findById("product_categories", parentCategory, "Parent category not found");
  if (files.length === 0 || !name) {
    throw new HttpError(400, { error: "All fields are required for new SubCategory" });
  }
  const image = await uploadFile(files[0]);
  const row = must(
    await db()
      .from("product_subcategories")
      .insert({ name, description, image, parent_category_id: parentCategory })
      .select(SUBCATEGORY_SELECT)
      .single()
  );
  return json(S.subcategory(row), 201);
}

export async function getAllSubcategories() {
  const rows = must(await db().from("product_subcategories").select(SUBCATEGORY_SELECT).order("created_at"));
  return json(rows.map(S.subcategory));
}

export async function getSubcategoryById({ params }) {
  const row = await findById("product_subcategories", params.id, "Subcategory not found", SUBCATEGORY_SELECT);
  return json(S.subcategory(row));
}

export async function updateSubcategory({ params, body, files }) {
  await findById("product_subcategories", params.id, "Subcategory not found");
  const patch = {};
  if (body.name !== undefined) patch.name = body.name;
  if (body.description !== undefined) patch.description = body.description;
  if (body.parentCategory) {
    await findById("product_categories", body.parentCategory, "Parent category not found");
    patch.parent_category_id = body.parentCategory;
  }
  if (files.length > 0) patch.image = await uploadFile(files[0]);
  const query = Object.keys(patch).length
    ? db().from("product_subcategories").update(patch).eq("id", params.id).select(SUBCATEGORY_SELECT).single()
    : db().from("product_subcategories").select(SUBCATEGORY_SELECT).eq("id", params.id).single();
  return json(S.subcategory(must(await query)));
}

export async function deleteSubcategory({ params }) {
  await findById("product_subcategories", params.id, "Subcategory not found");
  must(await db().from("product_subcategories").delete().eq("id", params.id));
  return json({ message: "Subcategory deleted successfully" });
}

// ------------------------------------------------------------------ size / color / fabric / tag

function lookupHandlers({ table, field, idField, serialize, label }) {
  const lower = label.toLowerCase();

  async function assertUnique(name, exceptId) {
    const dup = must(await db().from(table).select("id").eq("name", name).maybeSingle());
    if (dup && dup.id !== exceptId) {
      throw new HttpError(400, {
        error: exceptId ? `Another ${lower} with same name already exists` : `${label} already exists`,
      });
    }
  }

  return {
    async add({ body }) {
      const name = String(body[field] ?? "").trim();
      if (!name) throw new HttpError(400, { error: `${label} is required` });
      await assertUnique(name);
      const row = must(await db().from(table).insert({ name }).select().single());
      return json({ message: `Product ${label} added successfully`, [`new${label}`]: serialize(row) }, 201);
    },

    async list() {
      return json(must(await db().from(table).select().order("created_at")).map(serialize));
    },

    async update({ body, params }) {
      const id = params.id || body[idField];
      if (!id) throw new HttpError(400, { error: `${label} ID is required` });
      await findById(table, id, `${label} not found`);
      const name = String(body[field] ?? "").trim();
      if (name) await assertUnique(name, id);
      const row = name
        ? must(await db().from(table).update({ name }).eq("id", id).select().single())
        : await findById(table, id, `${label} not found`);
      // Tags historically answered with { tag }, the others with { updated<Label> }.
      const key = table === "product_tags" ? "tag" : `updated${label}`;
      const message = table === "product_tags" ? "Tag updated successfully" : `Product ${label} updated successfully`;
      return json({ message, [key]: serialize(row) });
    },

    async remove({ params }) {
      const row = await findById(table, params.id, `${label} not found`);
      must(await db().from(table).delete().eq("id", params.id));
      return json({
        message: `${label} deleted successfully`,
        ...(table === "product_tags" && { tag: serialize(row) }),
      });
    },
  };
}

export const sizes = lookupHandlers({ table: "product_sizes", field: "Size", idField: "sizeId", serialize: S.size, label: "Size" });
export const colors = lookupHandlers({ table: "product_colors", field: "Color", idField: "colorId", serialize: S.color, label: "Color" });
export const fabrics = lookupHandlers({ table: "product_fabrics", field: "Fabric", idField: "fabricId", serialize: S.fabric, label: "Fabric" });
export const tags = lookupHandlers({ table: "product_tags", field: "Tag", idField: "tagId", serialize: S.tag, label: "Tag" });

// ------------------------------------------------------------------ category products

const isActive = (status) => status === true || status === "true" || status === "active";

async function ensureStockRows(productId, sizeList, minStocks) {
  if (!sizeList.length) return;
  must(
    await db()
      .from("product_size_stock")
      .upsert(
        sizeList.map((size) => ({ product_id: productId, size, quantity: 0, min_quantity: minStocks ?? 0 })),
        { onConflict: "product_id,size", ignoreDuplicates: true }
      )
  );
}

export async function addOrUpdateProductInCategory({ body, files, query }) {
  const { name, category, tag, color, fabric, size, status, description, additionalInfo } = body;
  const { productCategoryId, productsubCategoryId } = body;
  const mrp = num(body.mrp);
  const discount = num(body.discount);
  const minStocks = num(body.Minstocks);
  const { productId } = query;

  if (productId) {
    const existing = await findById("category_products", productId, "Product not found");
    const finalMrp = mrp ?? Number(existing.mrp);
    const finalDiscount = discount ?? Number(existing.discount);
    const parsedSizes = size ? csv(size) : existing.available_sizes;

    const patch = {
      name: name || existing.name,
      mrp: finalMrp,
      discount: finalDiscount,
      offer_price: offerPriceOf(finalMrp, finalDiscount),
      category: category || existing.category,
      tag: tag || existing.tag,
      colors: color ? csv(color) : existing.colors,
      fabric: fabric || existing.fabric,
      available_sizes: parsedSizes,
      description: description || existing.description,
      additional_info: additionalInfo || existing.additional_info,
      min_stocks: minStocks ?? existing.min_stocks,
      status: status === undefined || status === "" ? existing.status : isActive(status),
      product_category_id: productCategoryId || existing.product_category_id,
      subcategory_id: productsubCategoryId || existing.subcategory_id,
    };

    if (files.length > 0) {
      const { chart, images } = await uploadProductFiles(files);
      if (chart) patch.size_chart = chart;
      if (images.length > 0) patch.images = images;
    }

    must(await db().from("category_products").update(patch).eq("id", productId));
    await ensureStockRows(productId, parsedSizes, patch.min_stocks);
    const row = await findById("category_products", productId, "Product not found", PRODUCT_WITH_STOCK);
    return json({ message: "Product updated successfully", Product: S.categoryProduct(row) });
  }

  const parsedSizes = csv(size);
  if (!name || !mrp || !category || !productCategoryId || !productsubCategoryId || parsedSizes.length === 0) {
    throw new HttpError(400, {
      error: "Name, MRP, Category, Sizes and Category ID and Subcategory ID are required",
    });
  }
  if (files.length < 1) {
    throw new HttpError(400, { error: "Please upload at least one product image and size chart" });
  }
  await findById("product_categories", productCategoryId, "Product Category not found");
  await findById("product_subcategories", productsubCategoryId, "Product SubCategory not found");

  const { chart, images } = await uploadProductFiles(files);
  const row = must(
    await db()
      .from("category_products")
      .insert({
        name,
        mrp,
        discount: discount ?? 0,
        offer_price: offerPriceOf(mrp, discount ?? 0),
        category,
        images,
        size_chart: chart,
        tag,
        available_sizes: parsedSizes,
        colors: csv(color),
        fabric,
        description,
        additional_info: additionalInfo,
        min_stocks: minStocks ?? 0,
        status: isActive(status),
        product_category_id: productCategoryId,
        subcategory_id: productsubCategoryId,
      })
      .select()
      .single()
  );
  await ensureStockRows(row.id, parsedSizes, minStocks);
  const full = await findById("category_products", row.id, "Product not found", PRODUCT_WITH_STOCK);
  return json({ message: "Product added successfully", Product: S.categoryProduct(full) }, 201);
}

export async function getAllProductsFromAllCategories() {
  const rows = must(await db().from("category_products").select(PRODUCT_WITH_STOCK).order("created_at"));
  return json({
    message: rows.length > 0 ? "All products fetched successfully" : "No products available",
    products: rows.map(S.categoryProduct),
  });
}

export async function getProductByID({ params }) {
  if (!isUuid(params.id)) throw new HttpError(400, { error: "Invalid ObjectId" });
  const row = must(
    await db()
      .from("category_products")
      .select(`${PRODUCT_WITH_STOCK}, product_stock_history(*)`)
      .eq("id", params.id)
      .maybeSingle()
  );
  if (!row) throw new HttpError(404, { message: "Product not found" });
  return json({ message: "Product fetched successfully", product: S.categoryProduct(row) });
}

export async function deleteProduct({ params }) {
  await findById("category_products", params.id, "Product not found");
  must(await db().from("category_products").delete().eq("id", params.id));
  return json({ message: "Product deleted successfully" });
}

export async function updateProductStatus({ params, body }) {
  if (typeof body.status !== "boolean") throw new HttpError(400, { error: "Status must be true or false" });
  await findById("category_products", params.productId, "Product not found");
  const row = must(
    await db()
      .from("category_products")
      .update({ status: body.status })
      .eq("id", params.productId)
      .select(PRODUCT_WITH_STOCK)
      .single()
  );
  return json({ message: "Product status updated successfully", product: S.categoryProduct(row) });
}

// ------------------------------------------------------------------ stock

export async function getProductsWithStock() {
  const rows = must(
    await db()
      .from("category_products")
      .select("id, name, category, available_sizes, status, product_size_stock(*)")
      .order("created_at")
  );
  const products = rows.map((r) => {
    const stockBySize = (r.product_size_stock ?? []).map(S.stockEntry);
    return {
      _id: r.id,
      name: r.name,
      category: r.category,
      status: r.status,
      stockBySize,
      totalStock: stockBySize.reduce((sum, s) => sum + s.quantity, 0),
      availableSizes: (r.available_sizes ?? []).filter((size) => stockBySize.some((s) => s.size === size)),
    };
  });
  return json({ products });
}

export async function getProductStock({ params }) {
  const row = await findById(
    "category_products",
    params.productId,
    "Product not found",
    "name, available_sizes, min_stocks, product_size_stock(*)"
  );
  return json({
    productName: row.name,
    availableSizes: row.available_sizes,
    stockBySize: (row.product_size_stock ?? []).map(S.stockEntry),
    minStock: row.min_stocks,
  });
}

async function addStock(productId, { size, stockName, addedStock }) {
  const qty = num(addedStock);
  if (!size || !stockName || !qty || !Number.isInteger(qty)) {
    throw new HttpError(400, { error: "Size, stock name and valid quantity are required" });
  }
  const product = await findById("category_products", productId, "Product not found", "available_sizes, min_stocks");
  if (!(product.available_sizes ?? []).includes(size)) {
    throw new HttpError(400, { error: "Invalid size for this product" });
  }
  const currentStock = must(
    await db().rpc("add_product_stock", {
      p_product_id: productId,
      p_size: size,
      p_added: qty,
      p_stock_name: stockName,
    })
  );
  return { size, currentStock, minStock: product.min_stocks };
}

export async function updateStock({ params, body }) {
  const stock = await addStock(params.productId, body);
  return json({ message: "Stock updated successfully", stock });
}

/** Legacy endpoint; stock is tracked per size, so a size is required. */
export async function updateCategoryStock({ body }) {
  await findById("product_categories", body.productCategoryId, "Product Category not found");
  if (!body.productId) throw new HttpError(400, { message: "productId is required" });
  const stock = await addStock(body.productId, body);
  return json({ message: "Stock updated successfully", stock });
}

export async function getStockHistory({ params }) {
  await findById("category_products", params.productId, "Product not found", "id");
  const rows = must(
    await db()
      .from("product_stock_history")
      .select()
      .eq("product_id", params.productId)
      .order("added_at", { ascending: false })
  );
  return json(rows.map(S.stockHistoryEntry));
}
