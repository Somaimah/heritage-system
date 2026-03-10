import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase/firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const AdminDashboard = () => {
  const [statusData, setStatusData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      const snapshot = await getDocs(collection(db, "culturalItems"));

      // Initialize counts
      const statusCount = {};
      const categoryCount = {
        Artifacts: 0,
        Publications: 0,
        "Historical Records": 0,
      };

      snapshot.forEach((doc) => {
        const data = doc.data();

        // --- BAR CHART: Only validated, returned, posted ---
        const status = data.status?.toLowerCase();
        if (["validated", "returned", "posted"].includes(status)) {
          statusCount[status] = (statusCount[status] || 0) + 1;
        }

        // --- PIE CHART: Only the 3 main categories ---
        const category = data.category?.trim();
        if (["Artifacts", "Publications", "Historical Records"].includes(category)) {
          categoryCount[category]++;
        }
      });

      const statusChartData = Object.keys(statusCount).map((key) => ({
        status: key,
        count: statusCount[key],
      }));

      const categoryChartData = Object.keys(categoryCount).map((key) => ({
        name: key,
        value: categoryCount[key],
      }));

      setStatusData(statusChartData);
      setCategoryData(categoryChartData);
    };

    loadData();
  }, []);

  const barColors = ["#0088FE", "#00C49F", "#FFBB28"];
  const pieColors = ["#FF8042", "#00C49F", "#0088FE"];

  return (
    <div style={{ backgroundColor: "#800000", color: "white", minHeight: "100vh", padding: "20px" }}>
      <h2>Admin Dashboard</h2>
      <p>Overview of cultural items by status and category</p>

      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap" }}>
        {/* BAR CHART */}
        <div style={{ flex: "1 1 45%", minWidth: "300px", backgroundColor: "white", color: "#800000", borderRadius: "8px", padding: "20px", margin: "10px" }}>
          <h3>Status Overview</h3>
          <BarChart width={400} height={300} data={statusData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Bar dataKey="count">
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />
              ))}
            </Bar>
          </BarChart>
        </div>

        {/* PIE CHART */}
        <div style={{ flex: "1 1 45%", minWidth: "300px", backgroundColor: "white", color: "#800000", borderRadius: "8px", padding: "20px", margin: "10px" }}>
          <h3>Category Distribution</h3>
          <PieChart width={400} height={300}>
            <Pie
              data={categoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;