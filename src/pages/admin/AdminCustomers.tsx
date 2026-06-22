import { useEffect, useState } from "react";
import { FiMail, FiPhone } from "react-icons/fi";
import adminFetch from "../../axios/adminFetch";
import toast from "react-hot-toast";

interface AdminCustomer {
  id: number;
  name: string;
  lastname: string;
  email: string;
  phone: string | null;
  role: string;
  orderCount: number;
  createdAt: string;
}

const AdminCustomers = () => null;

export default AdminCustomers;
