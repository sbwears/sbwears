import { React, useState, useEffect } from "react";
import { IoIosArrowRoundForward } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { MdOutlineKeyboardArrowDown, MdOutlineKeyboardArrowRight } from "react-icons/md";
import { RiDeleteBin6Line } from "react-icons/ri";
import axios from "axios";
import { useNavigate } from "@/lib/router";

const FilterSection = ({ title, isOpen, onToggle, children }) => {
  return (
    <div className="w-full border-gray-200">
      <button
        className="w-full py-4 flex justify-between items-center text-left"
        onClick={onToggle}
      >
        <span className="text-sm tracking-widest flex flex-row gap-2 font-medium">
          <FiShoppingCart className="w-5 h-5 cursor-pointer" />
          {title}
        </span>
        <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>
          <MdOutlineKeyboardArrowDown className="w-6 h-8" />
        </span>
      </button>
      {isOpen && <div className="pb-4">{children}</div>}
    </div>
  );
};

function Checkout() {
  const [component, setComponent] = useState("address");
  const [couponCode, setCouponCode] = useState("");
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openSections, setOpenSections] = useState(false);
  const [address, setAddress] = useState({
    name: "",
    phone: "",
    street: "",
    city: "",
    state: "",
    pincode: "",
    country: "India"
  });
  const [orderSuccess, setOrderSuccess] = useState(false);

  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();

  const getCart = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`/api/users/user/${userId}`);
      setCartItems(res.data?.cart || []);
    } catch (err) {
      console.error("Failed to fetch cart:", err);
      setError("Failed to load cart items. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getCart();
  }, []);

  const toggleSection = () => {
    setOpenSections((prev) => !prev);
  };

  const updateQuantity = async (productId, size, newQuantity) => {
    try {
      if (newQuantity < 1) return;

      await axios.post("/api/admin/cart/add", {
        userId,
        productId,
        quantity: newQuantity,
        size
      });
      getCart();
    } catch (err) {
      console.error("Failed to update quantity:", err);
      setError("Failed to update quantity. Please try again.");
    }
  };

  const removeItem = async (productId, size) => {
    try {
      await axios.post("/api/admin/cart/remove", {
        userId,
        productId,
        size,
        removeAll: true
      });
      getCart();
    } catch (err) {
      console.error("Failed to remove item:", err);
      setError("Failed to remove item. Please try again.");
    }
  };

  const calculateSubtotal = () => {
    return cartItems.reduce((total, item) => {
      return total + (item.productId?.offerPrice || 0) * item.quantity;
    }, 0);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({ ...prev, [name]: value }));
  };
  console.log("cartItems : " , cartItems)
  const initiatePhonePePayment = async () => {
    try {
      const config = {
        method: 'post',
        url: '/api/orders/createOrder',
        headers: {
          'Content-Type': 'application/json',
          // Include authorization token if needed:
          // 'Authorization': `Bearer ${token}`
        },
        data: {
          userId: userId,         // ensure this is defined
          items: cartItems,       // array of cart items
          address: address,       // should be an object
          couponCode: couponCode, // string or null
          subtotal: calculateSubtotal(), // function that returns a number
          status: 'pending',
          paymentMethod:"Online"
        }
      };
      const orderData = {
        userId,
        username: address.name,
        Mobile: address.phone,
        amount: calculateSubtotal(),
        orderId: `ORDER_${Date.now()}`,
        config: JSON.stringify(config),
        successUrl: `/account`,
        failedUrl: `/checkout`
      };

      const response = await axios.post(
        "/api/user/addpaymentphonepay",
        orderData
      );
      console.log(response, "nnnnnnnnnnnnnnnnnnnnnnnnnnnnnn")

      if (response.data.url) {
        // Redirect to PhonePe payment page
        window.location.href = response.data.url;
      } else {
        setError("Failed to initiate payment. Please try again.");
      }
    } catch (err) {
      console.error("Payment initiation failed:", err);
      setError("Failed to initiate payment. Please try again.");
    }
  };

  const OrderSummary = () => {
    if (loading) return <div className="p-4 text-center">Loading cart items...</div>;
    if (error) return <div className="p-4 text-red-500 text-center">{error}</div>;
    if (cartItems.length === 0 && !orderSuccess) return <div className="p-4 text-center">Your cart is empty</div>;

    return (
      <div className="flex flex-col max-h-96 overflow-y-auto bg-white">
        {!orderSuccess && cartItems.map((item) => (
          <div key={item._id} className="flex flex-row mt-5 border-b pb-5">
            <img
              className="h-24 w-20 object-cover object-center rounded"
              src={`/image/${item?.productId?.images?.[0]}`}
              alt={item.productId?.name}
            />
            <div className="flex flex-col ml-5 flex-1">
              <p className="mb-2 text-sm font-medium">{item.productId?.name}</p>
              <div className="mb-2 text-sm font-semibold">₹{item.productId?.offerPrice?.toLocaleString()}</div>
              <div className="mb-2 text-sm text-gray-600">Size: {item.size}</div>
              <div className="flex items-center justify-between mt-2 gap-2">
                <div className="flex items-center border rounded gap-1">
                  <button
                    className="w-8 h-8 text-gray-800 hover:bg-gray-100 rounded-md flex items-center justify-center"
                    onClick={() => updateQuantity(item.productId._id, item.size, item.quantity - 1)}
                  >
                    −
                  </button>
                  <span className="text-gray-800 px-2">{item.quantity}</span>
                  <button
                    className="w-8 h-8 text-gray-800 hover:bg-gray-100 rounded-md flex items-center justify-center"
                    onClick={() => updateQuantity(item.productId._id, item.size, item.quantity + 1)}
                  >
                    ＋
                  </button>
                </div>
                <button
                  className="text-gray-500 hover:text-red-500 transition-colors"
                  onClick={() => removeItem(item.productId._id, item.size)}
                >
                  <span className="sr-only">Remove</span>
                  <RiDeleteBin6Line className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!orderSuccess && (
          <div className="flex flex-row justify-between mt-5 pt-3 border-t">
            <p className="tracking-wide font-medium">SUBTOTAL</p>
            <p className="font-semibold">₹{calculateSubtotal().toLocaleString()}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="my-20 h-full flex items-center justify-center px-4 relative">
      {component === "address" && !orderSuccess && (
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <p className="text-xl font-semibold mb-4">Shipping Details</p>
            <div className="flex flex-row items-center justify-between cursor-pointer">
              <FilterSection
                title="Order Summary"
                isOpen={openSections}
                onToggle={toggleSection}
              >
                <OrderSummary />
              </FilterSection>
            </div>
          </div>

          <form className="mt-4">
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-medium">Shipping Address</h3>

              <div>
                <label className="block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={address.name}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={address.phone}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Street Address</label>
                <input
                  type="text"
                  name="street"
                  value={address.street}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">City</label>
                  <input
                    type="text"
                    name="city"
                    value={address.city}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">State</label>
                  <input
                    type="text"
                    name="state"
                    value={address.state}
                    onChange={handleAddressChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Pincode</label>
                <input
                  type="text"
                  name="pincode"
                  value={address.pincode}
                  onChange={handleAddressChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md p-2"
                  required
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setComponent("payment")}
              className="mt-6 w-full flex flex-row justify-center items-center bg-black text-white py-3 px-4 rounded-md hover:bg-gray-800 transition-colors"
              disabled={!address.street || !address.city || !address.pincode}
            >
              <p className="pr-3">Continue to Payment</p>
              <IoIosArrowRoundForward className="w-8 h-8" />
            </button>
          </form>
        </div>
      )}

      {component === "payment" && !orderSuccess && (
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
          <div className="text-center">
            <p className="text-xl font-semibold mb-4">Payment Method</p>
            <div className="flex flex-row items-center justify-between cursor-pointer">
              <FilterSection
                title="Order Summary"
                isOpen={openSections}
                onToggle={toggleSection}
              >
                <OrderSummary />
              </FilterSection>
            </div>
          </div>

          <div className="mt-6">
            <p className="mt-6 font-medium">Payment Options</p>
            <div className="flex mt-3 gap-3 flex-col">
              <button
                className="bg-black p-4 cursor-pointer rounded-md flex items-center justify-between flex-row hover:bg-gray-800 transition-colors"
                onClick={initiatePhonePePayment}
              >
                <p className="font-semibold text-white">UPI (PhonePe)</p>
                <div className="flex flex-row items-center gap-2">
                  <p className="text-white">₹{calculateSubtotal().toLocaleString()}</p>
                  <MdOutlineKeyboardArrowRight className="text-white w-6 h-6" />
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Checkout;