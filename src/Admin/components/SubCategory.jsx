// import React, { useState, useEffect } from "react";
// import { RiDeleteBin6Line } from "react-icons/ri";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
// import Modal from "./Modal";
// import axios from "axios";

// export default function SubCategory() {
//   const [isModalOpen, setModalOpen] = useState(false);
//   const [parentCategory, setParentCategories] = useState([]);
//   const [categories, setCategories] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState(null);
//   const [isEditing, setIsEditing] = useState(false);
//   const [currentCategoryId, setCurrentCategoryId] = useState(null);
//   const [description, setDescription] = useState("");
//   const [formData, setFormData] = useState({
//     SubCategoryName: "",
//     parentCategory: "",
//     coupon: "",
//   });
//   const [selectedFile, setSelectedFile] = useState(null);
//   console.log("categories : " , categories)
//   const openModal = () => {
//     setModalOpen(true);
//     setIsEditing(false);
//     setCurrentCategoryId(null);
//     setFormData({
//       SubCategoryName: "",
//       coupon: "",
//     });
//     setDescription("");
//     setSelectedFile(null);
//     setError(null);
//   };

//   const closeModal = () => setModalOpen(false);

//   const handleEditorChange = (event, editor) => {
//     const data = editor.getData();
//     setDescription(data);
//   };

//   const handleFileChange = (e) => {
//     setSelectedFile(e.target.files[0]);
//   };

//   const handleInputChange = (e) => {
//     const { name, value } = e.target;
//     setFormData((prev) => ({
//       ...prev,
//       [name]: value,
//     }));
//   };

//   // Fetch categories
//   const fetchCategories = async () => {
//     try {
//       setLoading(true);
//       const response = await axios.get(
//         "/api/admin/subcategory"
//       );
//       setCategories(response.data || []);
//     } catch (err) {
//       setError(err.response?.data?.error || "Failed to fetch categories");
//       console.error("Error fetching categories:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchCategories();
//   }, []);

//     // Fetch categories
//     const fetchParentCategories = async () => {
//         try {
//         setLoading(true);
//         const response = await axios.get(
//             "/api/admin/product/category"
//         );
//         setParentCategories(response.data || []);
//         } catch (err) {
//         setError(err.response?.data?.error || "Failed to fetch categories");
//         console.error("Error fetching categories:", err);
//         } finally {
//         setLoading(false);
//         }
//     };

//     useEffect(() => {
//         fetchParentCategories();
//     }, []);
 
//   const handleEdit = async (category) => {
//     setIsEditing(true);
//     setCurrentCategoryId(category._id);
//     setModalOpen(true);
//     setFormData({
//       category: category.name || "",
//       coupon: "",
//       parentCategory: "",
//     });
//     setDescription(category.description || "");
//     setSelectedFile(null); // Don’t load image by default for edit
//     setError(null);
//   };
 
//   const handleSubmit = async (e) => {
//     e?.preventDefault();

//     try {
//       setLoading(true);
//       setError(null);

//       const formDataToSend = new FormData();
//       if (formData.SubCategoryName)
//         formDataToSend.append("name", formData.SubCategoryName);
//       if (description) formDataToSend.append("description", description);
//       if (parentCategory) formDataToSend.append("parentCategory", parentCategory);
//       if (selectedFile) formDataToSend.append("image", selectedFile);
//         console.log("formData.SubCategoryName : " , formData.SubCategoryName , description , parentCategory , selectedFile)
//       let response;
//       if (isEditing && currentCategoryId) {
//         formDataToSend.append("CategoryId", currentCategoryId);
//         response = await axios.post(
//           `/api/admin/product/category/${currentCategoryId}`,
//           formDataToSend,
//           { headers: { "Content-Type": "multipart/form-data" } }
//         );
//       } else {
//         if (!selectedFile || !formData.category || !description || !parentCategory) {
//           throw new Error(
//             "Image, SubCategory, Category and Description are required for new category"
//           );
//         }

//         response = await axios.post(
//           "/api/admin/subcategory",
//           formDataToSend,
//           { headers: { "Content-Type": "multipart/form-data" } }
//         );
//       }

//       if (response.data?.message) {
//         alert(response.data.message);
//         fetchCategories();
//         closeModal();
//       }
//     } catch (error) {
//       console.error("Error submitting category:", error);
//       setError(
//         error.response?.data?.error ||
//           error.message ||
//           "Error processing category"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   // Handle delete
//   const handleDelete = async (id) => {
//     if (window.confirm("Are you sure you want to delete this category?")) {
//       try {
//         setLoading(true);
//         const response = await axios.delete(
//           `/api/admin/product/category/${id}`
//         );
//         if (response.data?.message) {
//           alert(response.data.message);
//           fetchCategories();
//         }
//       } catch (err) {
//         setError(err.response?.data?.error || "Error deleting category");
//         console.error("Error deleting category:", err);
//       } finally {
//         setLoading(false);
//       }
//     }
//   };

//   return (
//     <div className="flex flex-col w-full overflow-auto overflow-x-scroll">
//       {error && (
//         <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mx-5 mt-5">
//           {error}
//           <button
//             onClick={() => setError(null)}
//             className="absolute top-0 right-0 px-2 py-1"
//           >
//             &times;
//           </button>
//         </div>
//       )}

//       <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
//         <p className="text-xl font-bold mb-5">Add New Sub Category</p>
//         <button
//           onClick={openModal}
//           className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
//           disabled={loading}
//         >
//           {loading ? "Loading..." : "Add Sub Category"}
//         </button>
//         <Modal isOpen={isModalOpen} onClose={closeModal}>
//           <form onSubmit={handleSubmit}>
//             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
//               <div className="">
//                 <label className="block px-2 text-sm">Upload Image</label>
//                 <input
//                   type="file"
//                   name="image"
//                   onChange={handleFileChange}
//                   className="py-2 focus:outline-none cursor-pointer"
//                 />
//               </div>
//               <div>
//                 <label className="block px-2 text-sm mb-2">Sub Category Name</label>
//                 <input
//                   type="text"
//                   name="category"
//                   value={formData.SubCategoryName}
//                   placeholder="Enter Sub Category"
//                   onChange={handleInputChange}
//                   className="w-full py-2 border px-2 rounded-lg focus:outline-none"
//                   required
//                 />
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">
//                 Product Category
//                 </label>
//                 <select
//                 name="productCategoryId"
//                 value={formData.parentCategory}
//                 onChange={handleInputChange}
//                 className="w-full p-2 border rounded"
//                 required
//                 >
//                 <option value="">Select Category</option>
//                 {parentCategory.map((cat) => (
//                     <option key={cat._id} value={cat._id}>
//                     {cat.Category}
//                     </option>
//                 ))}
//                 </select>
//             </div>
//               <div>
//                 <label
//                   htmlFor="product-description"
//                   className="block text-sm font-medium mb-2"
//                 >
//                   Product Description:
//                 </label>
//                 <div
//                   className="p-2 border border-gray-300 rounded-md"
//                   id="product-description"
//                 >
//                   <CKEditor
//                     editor={ClassicEditor}
//                     data={description}
//                     onChange={handleEditorChange}
//                   />
//                 </div>
//               </div>
//             </div>

//             <div className="flex flex-row justify-between">
//               <button
//                 type="button"
//                 onClick={closeModal}
//                 className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
//                 disabled={loading}
//               >
//                 Cancel
//               </button>
//               <button
//                 type="submit"
//                 className="mt-6 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
//                 disabled={loading}
//               >
//                 {loading ? "Processing..." : isEditing ? "Update" : "Save"}
//               </button>
//             </div>
//           </form>
//         </Modal>
//       </div>
//       <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
//         <p className="text-xl font-bold p-3 pt-0">Previous Categories</p>
//         {loading ? (
//           <div className="text-center py-10">Loading sub categories...</div>
//         ) : categories?.length === 0 ? (
//           <div className="text-center py-10">No subcategories found</div>
//         ) : (
//           <div className="flex flex-col gap-5 justify-between">
//             <div className="flex flex-row bg-black justify-between border-b p-4 rounded-lg">
//               <p className="font-black text-white">Image</p>
//               <p className="font-black text-white">SubCategory</p>
//               <p className="font-black text-white">Description</p>
//               <p className="font-black text-white mr-3">Action</p>
//             </div>
//             {categories?.map((category, index) => (
//               <div
//                 className="flex flex-row justify-between border-b p-2"
//                 key={index}
//               >
//                 <div className="flex flex-col gap-2 items-center justify-center">
//                   {category?.image && (
//                     <img
//                       className="h-28 w-28 object-cover"
//                       src={`/image/${category.image}`}
//                       alt="category"
//                     />
//                   )}
//                 </div>

//                 <div className="flex flex-col gap-2 items-center justify-center">
//                   <p className="text-sm">{category?.name}</p>
//                 </div>
//                 <div className="flex flex-col gap-2 items-center justify-center">
//                   <div
//                     className="text-sm"
//                     dangerouslySetInnerHTML={{ __html: category?.description }}
//                   />
//                 </div>
//                 <div className="flex flex-row items-center justify-center gap-8">
//                   <button
//                     className="cursor-pointer"
//                     onClick={() => handleEdit(category)}
//                   >
//                     <EditIcon />
//                   </button>
//                   <button
//                     className="pb-1 cursor-pointer"
//                     onClick={() => handleDelete(category._id)}
//                   >
//                     <RiDeleteBin6Line className="h-5 w-5" />
//                   </button>
//                 </div>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// const EditIcon = () => (
//   <svg
//     xmlns="http://www.w3.org/2000/svg"
//     className="h-5 w-5"
//     viewBox="0 0 20 20"
//     fill="currentColor"
//   >
//     <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
//   </svg>
// );
import React, { useState, useEffect } from "react";
import { RiDeleteBin6Line } from "react-icons/ri";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import Modal from "./Modal";
import axios from "axios";

export default function SubCategory() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [parentCategories, setParentCategories] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [description, setDescription] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    parentCategory: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);

  const openModal = () => {
    setModalOpen(true);
    setIsEditing(false);
    setCurrentCategoryId(null);
    setFormData({
      name: "",
      parentCategory: "",
    });
    setDescription("");
    setSelectedFile(null);
    setError(null);
  };

  const closeModal = () => setModalOpen(false);

  const handleEditorChange = (event, editor) => {
    const data = editor.getData();
    setDescription(data);
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Fetch subcategories
  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "/api/admin/subcategory"
      );
      setCategories(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch subcategories");
      console.error("Error fetching subcategories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch parent categories
  const fetchParentCategories = async () => {
    try {
      const response = await axios.get(
        "/api/admin/product/category"
      );
      setParentCategories(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch parent categories");
      console.error("Error fetching parent categories:", err);
    }
  };

  useEffect(() => {
    fetchParentCategories();
  }, []);

  const handleEdit = (category) => {
    setIsEditing(true);
    setCurrentCategoryId(category._id);
    setModalOpen(true);
    setFormData({
      name: category.name || "",
      parentCategory: category.parentCategory?._id || "",
    });
    setDescription(category.description || "");
    setSelectedFile(null);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", description);
      formDataToSend.append("parentCategory", formData.parentCategory);
      
      if (selectedFile) {
        formDataToSend.append("image", selectedFile);
      }
      console.log("abc : " , formData , description , selectedFile)

      let response;
      if (isEditing && currentCategoryId) {
        console.log("currentCategoryId : " , currentCategoryId )
        response = await axios.put(
          `/api/admin/subcategory/${currentCategoryId}`,
          formDataToSend,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      } else {
        if (!selectedFile) {
          throw new Error("Image is required for new subcategory");
        }

        response = await axios.post(
          "/api/admin/subcategory",
          formDataToSend,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
      }

      if (response.data) {
        alert(isEditing ? "Subcategory updated successfully" : "Subcategory created successfully");
        fetchCategories();
        closeModal();
      }
    } catch (error) {
      console.error("Error submitting subcategory:", error);
      setError(
        error.response?.data?.error ||
          error.message ||
          "Error processing subcategory"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this subcategory?")) {
      try {
        setLoading(true);
        const response = await axios.delete(
          `/api/admin/subcategory/${id}`
        );
        console.log("RESPONSE : " , response)
        if (response?.data?.message) {
          alert(response.data.message);
          fetchCategories();
        }
      } catch (err) {
        setError(err.response?.data?.error || "Error deleting subcategory");
        console.error("Error deleting subcategory:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col w-full overflow-auto overflow-x-scroll">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mx-5 mt-5">
          {error}
          <button
            onClick={() => setError(null)}
            className="absolute top-0 right-0 px-2 py-1"
          >
            &times;
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
        <p className="text-xl font-bold mb-5">Add New Sub Category</p>
        <button
          onClick={openModal}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
          disabled={loading}
        >
          {loading ? "Loading..." : "Add Sub Category"}
        </button>
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="">
                <label className="block px-2 text-sm">Upload Image</label>
                <input
                  type="file"
                  name="image"
                  onChange={handleFileChange}
                  className="py-2 focus:outline-none cursor-pointer"
                  required={!isEditing}
                />
              </div>
              <div>
                <label className="block px-2 text-sm mb-2">Sub Category Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  placeholder="Enter Sub Category"
                  onChange={handleInputChange}
                  className="w-full py-2 border px-2 rounded-lg focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Parent Category
                </label>
                <select
                  name="parentCategory"
                  value={formData.parentCategory}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                >
                  <option value="">Select Category</option>
                  {parentCategories.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.Category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="product-description"
                  className="block text-sm font-medium mb-2"
                >
                  Product Description:
                </label>
                <div
                  className="p-2 border border-gray-300 rounded-md"
                  id="product-description"
                >
                  <CKEditor
                    editor={ClassicEditor}
                    data={description}
                    onChange={handleEditorChange}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-row justify-between">
              <button
                type="button"
                onClick={closeModal}
                className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="mt-6 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300"
                disabled={loading}
              >
                {loading ? "Processing..." : isEditing ? "Update" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
      <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
        <p className="text-xl font-bold p-3 pt-0">Previous Subcategories</p>
        {loading ? (
          <div className="text-center py-10">Loading sub categories...</div>
        ) : categories?.length === 0 ? (
          <div className="text-center py-10">No subcategories found</div>
        ) : (
          <div className="flex flex-col gap-5 justify-between">
            <div className="flex flex-row bg-black justify-between border-b p-4 rounded-lg">
              <p className="font-black text-white">Image</p>
              <p className="font-black text-white">SubCategory</p>
              <p className="font-black text-white">Parent Category</p>
              <p className="font-black text-white">Description</p>
              <p className="font-black text-white mr-3">Action</p>
            </div>
            {categories?.map((category, index) => (
              <div
                className="flex flex-row justify-between border-b p-2"
                key={index}
              >
                <div className="flex flex-col gap-2 items-center justify-center">
                  {category?.image && (
                    <img
                      className="h-28 w-28 object-cover"
                      src={`/image/${category.image}`}
                      alt="category"
                    />
                  )}
                </div>

                <div className="flex flex-col gap-2 items-center justify-center">
                  <p className="text-sm">{category?.name}</p>
                </div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <p className="text-sm">{category?.parentCategory?.Category}</p>
                </div>
                <div className="flex flex-col gap-2 items-center justify-center">
                  <div
                    className="text-sm"
                    dangerouslySetInnerHTML={{ __html: category?.description }}
                  />
                </div>
                <div className="flex flex-row items-center justify-center gap-8">
                  <button
                    className="cursor-pointer"
                    onClick={() => handleEdit(category)}
                  >
                    <EditIcon />
                  </button>
                  <button
                    className="pb-1 cursor-pointer"
                    onClick={() => handleDelete(category._id)}
                  >
                    <RiDeleteBin6Line className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const EditIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-5 w-5"
    viewBox="0 0 20 20"
    fill="currentColor"
  >
    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
  </svg>
);