import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "@/lib/router";
import axios from "axios"; 

export default function SubCategory() {
  const navigate = useNavigate();
  const handleClick = (productId) => { 
    navigate(`/productsList?category=${productId}`)
  };

  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const location = useLocation();
  const [sortOrder, setSortOrder] = useState("");

  const getProducts = async () => {
    try {
      setIsLoading(true);
      const res = await axios.get("/api/admin/subcategory");
      let allProducts = res.data || [];
      
      // Get search and category params
      const searchParams = new URLSearchParams(location.search);
      const searchQuery = searchParams.get("search")?.toLowerCase(); 
      const categoryQuery = searchParams.get("id"); 
      
      // Filter by search keyword
      if (searchQuery) {
        allProducts = allProducts.filter(
          (p) =>
            p.name?.toLowerCase().includes(searchQuery) ||
            p.description?.toLowerCase().includes(searchQuery)
        );
      }
      
      // Filter by category ID
      if (categoryQuery) {
        allProducts = allProducts.filter( 
          (p) => p?.parentCategory?._id === categoryQuery
        );
      }

      // Apply sort if present
      if (sortOrder === "lowToHigh") {
        allProducts.sort((a, b) => a.offerPrice - b.offerPrice);
      } else if (sortOrder === "highToLow") {
        allProducts.sort((a, b) => b.offerPrice - a.offerPrice);
      }

      setProducts(allProducts);
      setFilteredProducts(allProducts);
    } catch (error) {
      console.error("Error fetching products:", error);
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    getProducts();
  }, [location.search, sortOrder]);

  // Skeleton loader component
  const SkeletonLoader = () => (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, index) => (
        <div key={index} className="mb-6 animate-pulse">
          <div className="h-80 w-60 bg-gray-200 rounded-md"></div>
          <div className="mt-2 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="container flex flex-col mx-auto mt-5 lg:flex-row">  
      <div className="flex flex-col w-full"> 
 
        {isLoading ? (
          <SkeletonLoader />
        ) : filteredProducts.length > 0 ? (
            <>
                <div className="flex-row justify-between hidden lg:flex">
                <p className="mt-5 mb-5 text-xs text-gray-900">
                    {filteredProducts.length} SubCategories
                </p> 
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3">
                    {filteredProducts.map((product) => (
                    <div
                        key={product._id}
                        className="mb-6 " 
                    >
                    <img
                        className="h-80 w-60 object-cover object-center rounded-lg shadow-md transition-transform duration-300 hover:cursor-pointer hover:scale-105"
                        src={`/image/${product?.image}`}
                        alt={product.name}
                        onClick={() => handleClick(product._id)}
                        />
                        <p className="pt-2 pl-2 text-xs text-gray-900">
                        {product.name}
                        </p> 
                        <p className="pt-2 pl-2 text-xs text-gray-900">{product.availableSizes?.join(" ")}</p>
                    </div>
                    ))}
                </div>
            </>
        ) : (
          // Premium empty state UI
          <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
            <div className="mb-8">
              <svg 
                className="w-24 h-24 text-gray-300 mx-auto" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={1.5} 
                  d="M6 6h.008v.008H6V6z" 
                />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Subcategories Available</h2>
            
            <p className="text-gray-600 max-w-md mb-8">
              Currently there are no subcategories to display. Please check back later or explore our main categories.
            </p>
            
            <button 
              onClick={() => navigate("/")}
              className="px-6 py-3 bg-black text-white rounded-md hover:bg-gray-800 transition-colors duration-300 font-medium"
            >
              Browse Categories
            </button>
          </div>
        )}
      </div>
    </div>
  );
}