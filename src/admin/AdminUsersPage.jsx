import React, { useEffect, useState } from "react";
import { db } from "../firebase/firebase";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const AdminUsersPage = ({ changePage }) => {

  const [users, setUsers] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState({});

  const loadUsers = async () => {
    const snapshot = await getDocs(collection(db, "users"));

    const list = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setUsers(list);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleSelect = (id, role) => {
    setSelectedRoles(prev => ({
      ...prev,
      [id]: role
    }));
  };

  const confirmChange = async (id) => {

    const newRole = selectedRoles[id];

    if (!newRole) {
      alert("Please select a role first.");
      return;
    }

    const ok = window.confirm(`Change role to "${newRole}"?`);

    if (!ok) return;

    await updateDoc(doc(db, "users", id), {
      role: newRole
    });

    alert("Role updated successfully.");

    loadUsers();
  };

  return (
    <div>
      <h2>User Management</h2>

      {users.map(user => (
        <div key={user.id} style={{border:"1px solid black", padding:"10px", margin:"10px"}}>

          <p>Email: {user.email}</p>
          <p>Current Role: {user.role}</p>

          <label>
            Change Role:
            <select
              value={selectedRoles[user.id] || user.role}
              onChange={(e) => handleRoleSelect(user.id, e.target.value)}
            >
              <option value="user">User</option>
              <option value="encoder">Encoder</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <br /><br />

          <button onClick={() => confirmChange(user.id)}>
            Save Role
          </button>

        </div>
      ))}

      <br />

      <button onClick={() => changePage("dashboard")}>
        Back
      </button>
    </div>
  );
};

export default AdminUsersPage;