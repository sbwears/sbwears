"use client";

// Route compositions, mirroring the old src/App.js <Routes>. The page components read
// localStorage/window during render, so they are rendered on the client only.

import { Suspense, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { installHttpAuth } from "./http";

installHttpAuth();

const clientOnly = (load) => dynamic(load, { ssr: false, loading: () => null });

const Navbar = clientOnly(() => import("../components/Navbar.jsx"));
const Footer = clientOnly(() => import("../components/Footer.jsx"));
const Home = clientOnly(() => import("../screens/Home.jsx"));
const Contact = clientOnly(() => import("../screens/Contact.jsx"));
const ProductsListing = clientOnly(() => import("../screens/ProductsListing.jsx"));
const SubCategory = clientOnly(() => import("../screens/SubCategory.jsx"));
const ProductPage = clientOnly(() => import("../screens/ProductPage.jsx"));
const CustomerReviews = clientOnly(() => import("../components/CustomerReviews.jsx"));
const Profile = clientOnly(() => import("../screens/Profile.jsx"));
const PaymentSuccess = clientOnly(() => import("../screens/PaymentSuccess.jsx"));
const TrackOrder = clientOnly(() => import("../screens/TrackOrder.jsx"));
const Checkout = clientOnly(() => import("../screens/Checkout.jsx"));
const AdminLogin = clientOnly(() => import("../Admin/Pages/Login.jsx"));
const AdminDashboard = clientOnly(() => import("../Admin/Pages/Dashboard.jsx"));

function Shell({ navbar = false, footer = true, children }) {
  return (
    <Suspense fallback={null}>
      {navbar && <Navbar />}
      {children}
      {footer && <Footer />}
    </Suspense>
  );
}

export const HomeRoute = () => <Shell><Home /></Shell>;
export const ContactRoute = () => <Shell navbar><Contact /></Shell>;
export const ProductsListRoute = () => <Shell navbar><ProductsListing /></Shell>;
export const SubCategoryRoute = () => <Shell navbar><SubCategory /></Shell>;
export const ProductRoute = () => <Shell navbar><ProductPage /></Shell>;
export const ReviewsRoute = () => <Shell><CustomerReviews /></Shell>;
export const AccountRoute = () => <Shell navbar><Profile /></Shell>;
export const PaymentSuccessRoute = () => <Shell><PaymentSuccess /></Shell>;
export const TrackOrderRoute = () => <Shell navbar><TrackOrder /></Shell>;
export const CheckoutRoute = () => <Shell><Checkout /></Shell>;
export const AdminLoginRoute = () => <Shell footer={false}><AdminLogin /></Shell>;

export function AdminDashboardRoute() {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let token = null;
    try {
      token = window.localStorage.getItem("adminToken");
    } catch {
      /* storage unavailable */
    }
    // The API verifies the token on every admin call; this only avoids flashing the
    // dashboard to someone who is plainly not signed in.
    if (token) setAllowed(true);
    else router.replace("/admin/login");
  }, [router]);

  return allowed ? <Shell footer={false}><AdminDashboard /></Shell> : null;
}
