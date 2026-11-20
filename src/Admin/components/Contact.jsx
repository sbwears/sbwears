// import { React, useState } from "react";
// import { RiDeleteBin6Line } from "react-icons/ri";
// import { CKEditor } from "@ckeditor/ckeditor5-react";
// import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
// export default function Contact() {
//   const [description, setDescription] = useState("");

//   const handleEditorChange = (event, editor) => {
//     const data = editor.getData();
//     setDescription(data);
//     console.log("Editor Data: ", data);
//   };

//   return (
//     <div className="flex flex-col  w-full overflow-auto">
//       <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%  ">
//         <p className="text-xl font-bold mb-5">Add Contact Details</p>

//         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
//           <div>
//             <label
//               htmlFor="product-description"
//               className="block text-sm font-medium   mb-2"
//             >
//               Add Address:
//             </label>
//             <div
//               className="p-2 border border-gray-300 rounded-md"
//               id="product-description"
//             >
//               <CKEditor
//                 editor={ClassicEditor}
//                 data={description}
//                 onChange={handleEditorChange}
//               />
//             </div>
//           </div>
//           <div>
//             <label className="block text-sm px-2 mb-2">Mobile Number</label>
//             <input
//               type="phone"
//               name="phone"
//               placeholder="Add Mobile Number"
//               className="w-full py-2 border rounded-lg px-2 appearance-none focus:outline-none"
//             />
//           </div>

//           <div>
//             <label className="block px-2  text-sm mb-2">Email Adress</label>
//             <input
//               type="email"
//               name="coupon"
//               placeholder="Enter Email"
//               className="w-full py-2 border px-2 rounded-lg focus:outline-none "
//             />
//           </div>
//         </div>

//         <button className="mt-6 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300">
//           Save
//         </button>
//       </div>
//       <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%  flex felx-row items-start">
//         <div >

//         <p className="text-xl font-bold pb-5 pt-0">Previous Address</p>
//         <div className="flex flex-row items-start">
//           <div className="flex flex-col gap-5 ">
//             <p>
//               <span className="font-black mr-2">Address :</span>
//               Zivore Apparel Private Limited B 005, Sector 85, Noida, Gautam
//               Buddha Nagar, Uttar Pradesh 201301
//             </p>
//             <p>
//               <span className="font-black mr-2">Mobile :</span> +91 9899990772
//             </p>
//             <p>
//               <span className="font-black mr-2">Email :</span> care@sbwears.in
//             </p>
//           </div>
//         </div>
//         </div>
//           <div className="flex flex-row items-center justify-center gap-5 p-2">
//             <button className=" ">
//               <EditIcon />
//             </button>
//             <button className="pb-1">
//               <RiDeleteBin6Line className="h-5 w-5" />
//             </button>
//           </div>
//       </div>
//     </div>
//   );
// }

// function EditIcon() {
//   return (
//     <svg
//       width="24"
//       height="24"
//       viewBox="0 0 24 24"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <path
//         d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
//         stroke="currentColor"
//         strokeWidth="1.5"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       />
//     </svg>
//   );
// }
import React, { useState, useEffect } from "react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import axios from "axios";

export default function Contact() {
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [existingContact, setExistingContact] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Fetch existing contact details
  const fetchContactDetails = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/contact");
      // console.log("response : " , response)
      if (response.data) {
        setExistingContact(response.data);
        setAddress(response.data.address || "");
        setMobile(response.data.mobile || "");
        setEmail(response.data.email || "");
      }
    } catch (error) {
      if (error.response?.status !== 404) {
        console.error("Error fetching contact details:", error);
        setError("Failed to fetch contact details");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContactDetails();
  }, []);

  const handleEditorChange = (event, editor) => {
    const data = editor.getData();
    setAddress(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!address.trim() || !mobile.trim() || !email.trim()) {
      setError("All fields are required");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    if (!isValidMobile(mobile)) {
      setError("Please enter a valid mobile number");
      return;
    }
    // console.log("{ address, mobile, email } : " , { address, mobile, email })

    try {
      setLoading(true);
      setError("");
      setMessage("");

      if (existingContact) { 
        // Update existing contact
        const response = await axios.put(
          `/api/admin/contact/${existingContact._id}`,
          { address, mobile, email }
        );
        
        if (response.status === 200) {
          setMessage("Contact details updated successfully");
          setExistingContact(response.data.contact);
        }
      } else {
        // Create new contact
        const response = await axios.post(
          "/api/admin/contact",
          { address, mobile, email }
        );
        
        if (response.status === 201) {
          setMessage("Contact details created successfully");
          setExistingContact(response.data.contact);
        }
      }
    } catch (error) {
      console.error("Error saving contact details:", error);
      if (error.response?.status === 400) {
        setError(error.response.data.error);
      } else {
        setError("Failed to save contact details");
      }
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidMobile = (mobile) => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile.replace(/\D/g, ''));
  };

  const handleMobileChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
    setMobile(value);
  };

  return (
    <div className="flex flex-col w-full overflow-auto">
      {/* Message Display */}
      {message && (
        <div className="mx-5 mt-5 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
          {message}
          <button 
            className="float-right font-bold"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mx-5 mt-5 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button 
            className="float-right font-bold"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-5 rounded-lg shadow-lg">
            <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-black mx-auto"></div>
            <p className="mt-3">Saving contact details...</p>
          </div>
        </div>
      )}

      {/* Add/Edit Contact Form */}
      <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
        <p className="text-xl font-bold mb-5">
          {existingContact ? "Edit Contact Details" : "Add Contact Details"}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
            <div className="md:col-span-2">
              <label
                htmlFor="address"
                className="block text-sm font-medium mb-2"
              >
                Address:
              </label>
              <div className="p-2 border border-gray-300 rounded-md">
                <CKEditor
                  editor={ClassicEditor}
                  data={address}
                  onChange={handleEditorChange}
                  config={{
                    toolbar: [
                      'heading', '|', 'bold', 'italic', 'link', 'bulletedList', 
                      'numberedList', '|', 'undo', 'redo'
                    ]
                  }}
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm px-2 mb-2">Mobile Number</label>
              <input
                type="tel"
                value={mobile}
                onChange={handleMobileChange}
                placeholder="Enter 10-digit mobile number"
                className="w-full py-2 border rounded-lg px-2 appearance-none focus:outline-none focus:ring-2 focus:ring-black"
                maxLength={10}
                pattern="[0-9]{10}"
              />
            </div>

            <div>
              <label className="block px-2 text-sm mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full py-2 border px-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
            disabled={loading}
          >
            {existingContact ? "Update" : "Save"} Contact Details
          </button>
        </form>
      </div>

      {/* Display Existing Contact Details */}
      {existingContact && (
        <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
          <div className="flex flex-row justify-between items-start">
            <div className="flex-1">
              <p className="text-xl font-bold pb-5 pt-0">Current Contact Details</p>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="font-black mr-2 block mb-1">Address:</span>
                  <div 
                    className="text-gray-700"
                    dangerouslySetInnerHTML={{ __html: existingContact.address }} 
                  />
                </div>
                <div>
                  <span className="font-black mr-2">Mobile:</span>
                  <span className="text-gray-700">+91 {existingContact.mobile}</span>
                </div>
                <div>
                  <span className="font-black mr-2">Email:</span>
                  <span className="text-gray-700">{existingContact.email}</span>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  Last updated: {new Date(existingContact.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>
            
            {/* <div className="flex flex-row items-center justify-center gap-5 p-2">
              <button 
                className="text-blue-600 hover:text-blue-800"
                onClick={() => {
                  setAddress(existingContact.address);
                  setMobile(existingContact.mobile);
                  setEmail(existingContact.email);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                title="Edit contact details"
              >
                <EditIcon />
              </button>
            </div> */}
          </div>
        </div>
      )}
    </div>
  );
}

function EditIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

