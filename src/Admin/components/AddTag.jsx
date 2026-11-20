import React, { useState, useEffect } from "react";
import { RiDeleteBin6Line } from "react-icons/ri";
// import Modal from "./Modal";
import axios from "axios";

export default function AddTag() {
  const [isModalOpen, setModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState("");
  const [editingTag, setEditingTag] = useState({ id: "", Tag: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const openModal = () => setModalOpen(true);
  const closeModal = () => {
    setModalOpen(false);
    setNewTag("");
    setError("");
  };

  const openEditModal = (tag) => {
    setEditingTag(tag);
    setEditModalOpen(true);
  };

  const closeEditModal = () => {
    setEditModalOpen(false);
    setEditingTag({ id: "", Tag: "" });
    setError("");
  };

  // Fetch all tags
  const fetchTags = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/admin/productManagement/tag");
      setTags(response.data);
    } catch (error) {
      console.error("Error fetching tags:", error);
      setError("Failed to fetch tags");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  // Add new tag
  const handleAddTag = async () => {
    if (!newTag.trim()) {
      setError("Tag cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.post(
        "/api/admin/productManagement/tag",
        { Tag: newTag.trim() }
      );
      
      if (response.status === 201) {
        setTags([...tags, response.data.newTag]);
        closeModal();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setError("Tag already exists");
      } else {
        setError("Failed to add tag");
      }
      console.error("Error adding tag:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update tag
  const handleUpdateTag = async () => {
    if (!editingTag.Tag.trim()) {
      setError("Tag cannot be empty");
      return;
    }

    try {
      setLoading(true);
      const response = await axios.put(
        `/api/admin/productManagement/tag/${editingTag._id}`,
        { Tag: editingTag.Tag.trim() }
      );
      
      if (response.status === 200) {
        setTags(tags.map(tag => 
          tag._id === editingTag._id ? response.data.tag : tag
        ));
        closeEditModal();
      }
    } catch (error) {
      if (error.response?.status === 400) {
        setError("Tag already exists");
      } else {
        setError("Failed to update tag");
      }
      console.error("Error updating tag:", error);
    } finally {
      setLoading(false);
    }
  };

  // Delete tag
  const handleDeleteTag = async (tagId) => {
    if (!window.confirm("Are you sure you want to delete this tag?")) {
      return;
    }

    try {
      setLoading(true);
      const response = await axios.delete(
        `/api/admin/productManagement/tag/${tagId}`
      );
      
      if (response.status === 200) {
        setTags(tags.filter(tag => tag._id !== tagId));
      }
    } catch (error) {
      setError("Failed to delete tag");
      console.error("Error deleting tag:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full overflow-auto">
      {/* Error Message */}
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
            <div className="w-12 h-12 border-t-2 border-b-2 rounded-full animate-spin border-buttonColor mx-auto"></div>
            <p className="mt-3">Processing...</p>
          </div>
        </div>
      )}

      {/* Add New Tag Section */}
      <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
        <p className="text-xl font-bold mb-5">Add New Tag</p>
        <button
          onClick={openModal}
          className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
          disabled={loading}
        >
          Add Tag
        </button>
        
        {/* Add Tag Modal */}
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <h2 className="text-xl font-bold mb-4">Add New Tag</h2>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Enter tag name"
            className="w-full py-2 border mr-3 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-black"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
          />
          <div className="flex flex-row justify-between mt-6">
            <button
              onClick={closeModal}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              onClick={handleAddTag}
              disabled={loading}
            >
              Save
            </button>
          </div>
        </Modal>

        {/* Edit Tag Modal */}
        <Modal isOpen={isEditModalOpen} onClose={closeEditModal}>
          <h2 className="text-xl font-bold mb-4">Edit Tag</h2>
          <input
            type="text"
            value={editingTag.Tag}
            onChange={(e) => setEditingTag({...editingTag, Tag: e.target.value})}
            placeholder="Enter tag name"
            className="w-full py-2 border mr-3 rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-black"
            onKeyPress={(e) => e.key === 'Enter' && handleUpdateTag()}
          />
          <div className="flex flex-row justify-between mt-6">
            <button
              onClick={closeEditModal}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 shadow-lg transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50"
              onClick={handleUpdateTag}
              disabled={loading}
            >
              Update
            </button>
          </div>
        </Modal>
      </div>

      {/* Previous Added Tags Section */}
      <div className="bg-white rounded-xl my-5 mx-5 p-8 shadow-lg w-80%">
        <p className="text-xl font-bold p-3 pt-0">Previous Added Tags</p>
        
        {tags.length === 0 ? (
          <p className="text-gray-500 p-4">No tags added yet.</p>
        ) : (
          <div className="flex flex-col gap-5 w-2/5">
            <div className="flex flex-row bg-black justify-between border-b p-4 rounded-lg">
              <p className="font-black text-white">Tags</p>
              <p className="font-black mr-3 text-white">Action</p>
            </div>
            
            {tags.map((tag) => (
              <div
                className="flex flex-row justify-between border-b p-4 items-center"
                key={tag._id}
              >
                <div className="flex flex-col gap-2">
                  <p className="font-medium">{tag.Tag}</p>
                  <p className="text-xs text-gray-500">
                    Created: {new Date(tag.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-row items-center gap-4">
                  <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => openEditModal(tag)}
                    disabled={loading}
                  >
                    <EditIcon />
                  </button>
                  <button 
                    className="text-red-600 hover:text-red-800 pb-1"
                    onClick={() => handleDeleteTag(tag._id)}
                    disabled={loading}
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

function Modal ({ isOpen, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-96 max-w-full mx-4">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {children}
      </div>
    </div>
  );
}; 