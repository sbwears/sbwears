import React, { useEffect, useState } from "react";
import ProductInfo from "../components/ProductInfo";
import { useParams } from "@/lib/router";
import axios from "axios";

export default function ProductPage() {
  const [product, setProduct] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [imageLoading, setImageLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  const { id } = useParams();

  const handleSizeClick = (size) => {
    const stockInfo = product.stockBySize.find(item => item.size === size);
    if (stockInfo && stockInfo.quantity > 0) {
      setSelectedSize(size);
    }
  };

  const getProductById = async () => {
    try {
      const res = await axios(
        `/api/admin/category/product/${id}`
      );
      setProduct(res.data.product);
    } catch (err) {
      console.error("Error fetching product:", err);
    }
  };

  useEffect(() => {
    getProductById();
  }, []);

  const handleShare = async () => {
    const shareData = {
      title: product?.description || "Check this out!",
      text: "I found this amazing product!",
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Share failed:", err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        alert("Product link copied to clipboard!");
      } catch (err) {
        console.error("Clipboard copy failed:", err);
      }
    }
  };

  const handleImageLoad = () => {
    setImagesLoaded(prev => prev + 1);
    if (imagesLoaded + 1 >= product.images.length) {
      setImageLoading(false);
    }
  };

  if (!product)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-buttonColor"></div>
      </div>
    );

  const handleAddToCart = async () => {
    if (!selectedSize) {
      alert("Please select size");
      return;
    }
    const userId = localStorage.getItem("userId");
    if (!userId) {
      alert("Please login first");
      return;
    }

    try {
      const res = await axios.post(
        "/api/users/cart/add",
        {
          userId,
          productId: id,
          quantity: 1,
          size: selectedSize,
        }
      );
      if (res.status === 200) {
        alert("Product added to cart successfully");
        window.dispatchEvent(new Event("cartUpdated"));
        getProductById()
      }
    } catch (error) {
      console.log("Detailed error:", error.response?.data || error.message);
      alert(error.response?.data?.error || "Failed to add to cart");
    }
  };

  // Function to get stock information for a specific size
  const getStockInfo = (size) => {
    return product.stockBySize.find(item => item.size === size);
  };

  return (
    <>
      <div className="container flex-col px-4 py-5 mx-auto mt-5 lg:flex lg:flex-row">
        <div className="w-full lg:w-2/3">
          {/* Image loader */}
          {imageLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 mb-4">
              {product.images.map((_, index) => (
                <div key={index} className="w-full h-64 bg-gray-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          )}
          
          <div className={`grid grid-cols-1 gap-4 md:grid-cols-2 transition-opacity duration-300 ${imageLoading ? 'opacity-0' : 'opacity-100'}`}>
            {product.images.map((img, index) => (
              <img
                key={index}
                className="object-cover w-full h-auto rounded-lg"
                src={`/image/${img}`}
                alt={`product-${index + 1}`}
                loading="lazy"
                onLoad={handleImageLoad}
                style={imageLoading ? { display: 'none' } : {}}
              />
            ))}
          </div>
        </div>

        <div className="w-full mt-8 lg:w-1/3 lg:ml-8 lg:mt-0">
          <div className="lg:sticky lg:top-8">
            <h1 className="mb-4 text-xl font-black">
              {product.name}
            </h1>
            <p
              className="mb-4"
              dangerouslySetInnerHTML={{ __html: product.description }}
            ></p>

            <div className="flex items-center mb-4">
              {[...Array(5)].map((_, index) => (
                <svg
                  key={index}
                  className="w-4 h-4 text-ratingColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 .587l3.668 7.431 8.2 1.174-5.91 5.737 1.396 8.124L12 18.897l-7.354 3.856 1.396-8.124-5.91-5.737 8.2-1.174L12 .587z" />
                </svg>
              ))}
              <span className="ml-2 text-xs text-gray-500">(1)</span>
            </div>

            <div className="flex items-center justify-between mb-4">
              <p className="text-xs">ProductId : {product._id}</p>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="text-lg font-normal line-through">
                Rs. {product.mrp}
              </span>
              <span className="text-lg font-normal">
                Rs. {product.offerPrice}
              </span>
              <span className="text-lg font-normal text-red-500">
                {product.discount}%
              </span>
              <span className="ml-4 text-xs text-gray-400">
                Inclusive Of All Taxes
              </span>
            </div>

            <div className="mb-6">
              <p className="mb-2 text-sm">Size:</p>
              <div className="flex flex-wrap gap-3">
                {product.availableSizes?.map((size) => {
                  const stockInfo = getStockInfo(size);
                  const isOutOfStock = stockInfo && stockInfo.quantity === 0;
                  const isLowStock = stockInfo && stockInfo.quantity > 0 && stockInfo.quantity <= stockInfo.minQuantity;
                  
                  return (
                    <div key={size} className="relative">
                      <button
                        className={`w-12 h-12 rounded-full border flex items-center justify-center text-sm transition-all duration-300
                          ${
                            selectedSize === size
                              ? "bg-buttonColor text-white border-purple-custom"
                              : isOutOfStock 
                                ? "bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed"
                                : "bg-white border-gray-300 text-buttonColor hover:border-buttonColor"
                          }`}
                        onClick={() => !isOutOfStock && handleSizeClick(size)}
                        disabled={isOutOfStock}
                        title={isOutOfStock ? "Out of stock" : ""}
                      >
                        {size}
                        {isOutOfStock && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-px bg-gray-400 transform rotate-45"></div>
                          </div>
                        )}
                      </button>
                      
                      {/* Low stock indicator */}
                      {isLowStock && (
                        <div className="absolute -top-2 -right-2 bg-red-100 text-red-600 text-xs px-1.5 py-0.5 rounded-full border border-red-200">
                          {stockInfo.quantity} left
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Stock status messages */}
              {selectedSize && (
                <div className="mt-3 text-sm">
                  {(() => {
                    const stockInfo = getStockInfo(selectedSize);
                    if (stockInfo.quantity === 0) {
                      return (
                        <p className="text-red-500 font-medium">
                          This size is currently out of stock
                        </p>
                      );
                    } else if (stockInfo.quantity <= stockInfo.minQuantity) {
                      return (
                        <p className="text-orange-500 font-medium">
                          Only {stockInfo.quantity} left in stock - order soon!
                        </p>
                      );
                    } else {
                      return (
                        <p className="text-green-500 font-medium">
                          In stock
                        </p>
                      );
                    }
                  })()}
                </div>
              )}
            </div>

            <button
              className={`w-full py-4 mb-4 font-medium tracking-wider text-white transition-all duration-300 rounded-md 
                ${!selectedSize ? "bg-gray-400 cursor-not-allowed" : "bg-buttonColor hover:bg-opacity-90"}`}
              onClick={handleAddToCart}
              disabled={!selectedSize}
            >
              {!selectedSize ? "SELECT SIZE" : "ADD TO CART"}
            </button>

            {/* Share Button */}
            <button
              className="w-full py-3 mb-6 font-medium tracking-wider text-buttonColor border border-buttonColor rounded-md hover:bg-buttonColor hover:text-white transition-all duration-300"
              onClick={handleShare}
            >
              SHARE PRODUCT
            </button>

            <div className="space-y-4">
              <div className="flex items-center">
                <img
                  className="w-6 h-6"
                  src="https://cdn.shopify.com/s/files/1/0341/4805/7228/files/Group_357.svg?v=1714394429"
                  alt="Express Shipping"
                />
                <p className="ml-3 text-sm text-gray-600">Express Shipping</p>
              </div>

              <div className="flex items-center">
                <img
                  className="w-6 h-6"
                  src="https://cdn.shopify.com/s/files/1/0341/4805/7228/files/Icon_10.svg?v=1714394598"
                  alt="COD"
                />
                <p className="ml-3 text-sm text-gray-600">
                  Cash on Delivery Available
                </p>
              </div>

              <div className="flex items-start">
                <img
                  className="w-6 h-6 mt-1"
                  src="https://cdn.shopify.com/s/files/1/0341/4805/7228/files/Icon_11.svg?v=1714394430"
                  alt="Exchange"
                />
                <p className="ml-3 text-sm text-gray-600">
                  Easy 7 days exchanges: This item is only exchangeable for the
                  same or a different size, if available, and cannot be
                  returned.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <ProductInfo product={product} />
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 mx-auto"></div>
    </>
  );
}