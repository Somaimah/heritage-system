import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";

const AdminAnalyticsPage = ({ changePage }) => {
  const [total, setTotal] = useState(0);
  const [pending, setPending] = useState(0);
  const [approved, setApproved] = useState(0);
  const [rejected, setRejected] = useState(0);
  const [topItems, setTopItems] = useState([]);

  useEffect(() => {
    const loadAnalytics = async () => {
      const snapshot = await getDocs(collection(db, "culturalItems"));

      let t = 0, p = 0, a = 0, r = 0;
      let itemsWithViews = [];

      snapshot.docs.forEach(doc => {
        const data = doc.data();
        t++;

        if (data.status === "pending") p++;
        if (data.status === "validated") a++;
        if (data.status === "returned") r++;

        // Only include items with viewCount
        if (data.viewCount && data.viewCount > 0) {
          itemsWithViews.push({ id: doc.id, title: data.title, views: data.viewCount });
        }
      });

      // Sort descending by viewCount
      itemsWithViews.sort((x, y) => y.views - x.views);

      // Take top 5 most viewed
      const top5 = itemsWithViews.slice(0, 5);

      setTotal(t);
      setPending(p);
      setApproved(a);
      setRejected(r);
      setTopItems(top5);
    };

    loadAnalytics();
  }, []);

  return (
    <div>
      <h2>System Analytics</h2>
      <p>Total Submissions: {total}</p>
      <p>Pending: {pending}</p>
      <p>Approved: {approved}</p>
      <p>Rejected: {rejected}</p>

      <br />

      <h3>Top Viewed Items</h3>
      {topItems.length === 0 ? (
        <p>No viewed items yet.</p>
      ) : (
        <ol>
          {topItems.map(item => (
            <li key={item.id}>
              {item.title} — {item.views} view{item.views > 1 ? "s" : ""}
            </li>
          ))}
        </ol>
      )}

      <br />
      <button onClick={() => changePage("dashboard")}>Back</button>
    </div>
  );
};

export default AdminAnalyticsPage;