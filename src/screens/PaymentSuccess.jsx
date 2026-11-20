import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import axios from "axios";
import swal from "sweetalert";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const transactionId = searchParams.get("transactionId");
  const userId = searchParams.get("userID");

  const [paymentStatus, setPaymentStatus] = useState(null);
  const [paymentDetails, setPaymentDetails] = useState(null);

  const checkPaymentStatus = async () => {
    try {
      const url = `/api/user/checkPayment/${transactionId}/${userId}`;
      const response = await axios.get(url);
      console.log("Payment response : ", response);

      if (response.status === 200) {
        const paymentData = response.data.success;
        setPaymentDetails(paymentData);

        if (paymentData.status === "COMPLETED") {
          localStorage.removeItem("basket");
          setPaymentStatus("COMPLETED");
          setTimeout(() => {
            navigate(response.data.success.successUrl);
          }, 2500);
        } else {
          setPaymentStatus("FAILED");
          setTimeout(() => {
            navigate(response.data.success.failedUrl);
          }, 2500);
        }
      } else {
        swal({
          title: "Payment Verification Failed",
          text: "Unable to verify your payment status. Please contact support.",
          icon: "error",
          button: "OK",
        });
      }
    } catch (error) {
      console.error("Error checking payment status:", error);
      swal({
        title: "Error!",
        text: "Unable to verify payment status. Please try again.",
        icon: "error",
        button: "OK",
      });
    }
  };

  useEffect(() => {
    if (transactionId && userId) {
      checkPaymentStatus();
    } else {
      navigate("/");
    }
  }, [transactionId, userId, navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-r from-blue-100 via-indigo-100 to-purple-100 px-4">
      {paymentStatus === "COMPLETED" ? (
        <div className="bg-white shadow-2xl rounded-2xl p-10 text-center w-full max-w-lg border-t-8 border-green-500 animate-fadeIn transform transition duration-500 hover:scale-105">
          <FaCheckCircle className="text-green-500 mx-auto mb-5 drop-shadow-lg" size={80} />
          <h2 className="text-3xl font-bold text-green-600">Payment Successful 🎉</h2>
          <p className="mt-3 text-gray-600 text-lg">
            Thank you, <span className="font-semibold">{paymentDetails?.username}</span>! 
          </p>
          <p className="mt-2 text-xl font-bold text-gray-800">
            Amount Paid: <span className="text-green-600">₹{paymentDetails?.amount}</span>
          </p>
          <p className="mt-2 text-gray-500 text-sm">Redirecting you shortly...</p>
        </div>
      ) : paymentStatus === "FAILED" ? (
        <div className="bg-white shadow-2xl rounded-2xl p-10 text-center w-full max-w-lg border-t-8 border-red-500 animate-fadeIn transform transition duration-500 hover:scale-105">
          <FaTimesCircle className="text-red-500 mx-auto mb-5 drop-shadow-lg" size={80} />
          <h2 className="text-3xl font-bold text-red-600">Payment Failed ❌</h2>
          <p className="mt-3 text-gray-600 text-lg">
            We could not process your payment. Please try again.
          </p>
          <p className="mt-2 text-gray-500 text-sm">Redirecting you shortly...</p>
        </div>
      ) : (
        <div className="bg-white shadow-2xl rounded-2xl p-10 text-center w-full max-w-lg border-t-8 border-blue-500 animate-fadeIn transform transition duration-500 hover:scale-105">
          <div className="flex justify-center mb-5">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
          <h2 className="text-xl font-semibold text-blue-600">Verifying Payment...</h2>
          <p className="mt-2 text-gray-500 text-sm">Please wait while we check your transaction.</p>
        </div>
      )}
    </div>
  );
};

export default PaymentSuccess;
