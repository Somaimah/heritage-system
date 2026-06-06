import { useState, useEffect } from "react";
import { collection, query, where, or, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase/firebase"; 
import { useToast } from "../contexts/ToastContext"; 

export const useSystemData = (userRole = "admin") => {
  const { showToast } = useToast();
  
  const [culturalItems, setCulturalItems] = useState([]);
  const [proverbItems, setProverbItems] = useState([]);
  const [systemFeedbacks, setSystemFeedbacks] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [publishedProverbs, setPublishedProverbs] = useState([]);
  const [binnedProverbs, setBinnedProverbs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // 1. Cultural Items - Dependency array must stay empty []
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "culturalItems"), (snapshot) => {
      setCulturalItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Cultural Items listener error:", err);
    });
    return () => unsub();
  }, []); 

  // 2. Proverbs - Dependency array must stay empty []
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "proverb"), (snapshot) => {
      const allProverbs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProverbItems(allProverbs);
      setPublishedProverbs(allProverbs.filter(p => p.status === "posted" && !p.isDeleted));
      setBinnedProverbs(allProverbs.filter(p => p.isDeleted === true));
    }, (err) => {
      console.error("Proverbs listener error:", err);
    });
    return () => unsub();
  }, []);

  // 3. System Feedbacks - Dependency array must stay [userRole]
  useEffect(() => {
    if (userRole === "user" || userRole === "encoder") {
      setSystemFeedbacks([]);
      return;
    }

    const unsub = onSnapshot(collection(db, "systemFeedbacks"), (snapshot) => {
      setSystemFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Feedbacks listener error:", err);
    });
    return () => unsub();
  }, [userRole]); 

  // 4. Users - Dependency array must stay [userRole]
  useEffect(() => {
    if (userRole === "user" || userRole === "encoder") {
      setUsers([]);
      return;
    }

    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => {
      console.error("Users listener error:", err);
    });
    return () => unsub();
  }, [userRole]); 

  // 5. Notifications - Dependency array must stay [userRole]
  useEffect(() => {
    let unsubSnap = null;
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      
      if (!user) { 
        setUnreadCount(0); 
        setNotifications([]);
        return; 
      }
      
      const q = query(
        collection(db, "notifications"),
        or(
          where("userId", "==", user.uid),
          where("targetRoles", "array-contains", userRole),
          where("targetRole", "==", userRole),
          where("role", "==", userRole)
        )
      );
      
      unsubSnap = onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotifications(notifs);

        const unread = notifs.filter(data => {
          if (data.read === true || data.read === "true") return false;
          if (data.isReadBy && Array.isArray(data.isReadBy) && data.isReadBy.includes(user.uid)) return false;
          return true;
        });

        setUnreadCount(unread.length);
      }, (error) => {
        console.error("Notification listener error:", error);
      });
    });
    
    return () => { 
      unsubscribeAuth(); 
      if (unsubSnap) unsubSnap(); 
    };
  }, [userRole]);

  return { 
    items: culturalItems,
    culturalItems,
    proverbItems, 
    publishedProverbs, 
    binnedProverbs, 
    systemFeedbacks,
    users, 
    notifications,
    unreadCount 
  };
};