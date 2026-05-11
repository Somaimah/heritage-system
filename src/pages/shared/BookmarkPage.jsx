import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  getDoc
} from "firebase/firestore";

const BookmarkPage = ({ changePage }) => {
  const [bookmarks, setBookmarks] = useState([]);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, "bookmarks"),
      where("userId", "==", auth.currentUser.uid)
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const data = await Promise.all(
        snapshot.docs.map(async (d) => {
          const item = d.data();

          // 🔥 fallback: get full item if image missing
          if (!item.imageUrl) {
            const itemRef = doc(db, "culturalItems", item.itemId);
            const itemSnap = await getDoc(itemRef);

            if (itemSnap.exists()) {
              return {
                id: d.id,
                ...item,
                imageUrl: itemSnap.data().imageUrl || ""
              };
            }
          }

          return { id: d.id, ...item };
        })
      );

      setBookmarks(data);
    });

    return () => unsub();
  }, []);

  const removeBookmark = async (id) => {
    await deleteDoc(doc(db, "bookmarks", id));
  };

  return (
    <div className="min-h-screen bg-[#f5f5dc] p-8">

      <h1 className="text-2xl font-bold text-[#800000] mb-6">
        My Bookmarks
      </h1>

      {bookmarks.length === 0 && (
        <p className="text-gray-500">No bookmarks yet.</p>
      )}

      <div className="grid md:grid-cols-4 gap-6">

        {bookmarks.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl shadow-md overflow-hidden flex flex-col h-[300px]"
          >

            {/* ✅ IMAGE */}
            <div className="h-40 w-full bg-gray-200">
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  className="h-full w-full object-cover"
                  alt=""
                />
              )}
            </div>

            {/* CONTENT */}
            <div className="p-4 flex flex-col justify-between flex-1">

              <div>
                <h3 className="font-serif text-[#800000]">
                  {item.title}
                </h3>
              </div>

              <div className="flex gap-2 mt-3">

                <button
                  onClick={() =>
                    changePage("itemdetail", {
                      itemId: item.itemId,
                      fromPage: "bookmarks" // ✅ IMPORTANT
                    })
                  }
                  className="flex-1 bg-[#800000] text-white py-1 rounded"
                >
                  View
                </button>

                <button
                  onClick={() => removeBookmark(item.id)}
                  className="px-3 py-1 bg-gray-200 rounded hover:bg-red-500 hover:text-white"
                >
                  Remove
                </button>

              </div>
            </div>

          </div>
        ))}

      </div>

      <button
        onClick={() => changePage("dashboard")}
        className="mt-6 bg-[#800000] text-white px-5 py-2 rounded-lg"
      >
        Back
      </button>

    </div>
  );
};

export default BookmarkPage;