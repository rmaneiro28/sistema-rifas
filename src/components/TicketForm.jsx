// src/components/TicketForm.jsx
import { useState } from "react";

export default function TicketForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    raffle: "",
    user: "",
    amount: "",
    date: new Date().toISOString().slice(0, 10),
    status: "Active",
    winner: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(form, () => {
      setForm({
        raffle: "",
        user: "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
        status: "Active",
        winner: false,
      });
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-8 p-6 rounded-xl border border-[#23283a] bg-[#181c24] flex flex-col md:flex-row gap-4 items-end"
    >
      <div className="flex flex-col flex-1">
        <label className="text-sm text-white mb-1">Raffle</label>
        <input
          type="text"
          name="raffle"
          value={form.raffle}
          onChange={handleChange}
          className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
          required
        />
      </div>
      <div className="flex flex-col flex-1">
        <label className="text-sm text-white mb-1">User</label>
        <input
          type="text"
          name="user"
          value={form.user}
          onChange={handleChange}
          className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
          required
        />
      </div>
      <div className="flex flex-col w-28">
        <label className="text-sm text-white mb-1">Amount</label>
        <input
          type="number"
          name="amount"
          value={form.amount}
          onChange={handleChange}
          className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
          required
        />
      </div>
      <div className="flex flex-col w-36">
        <label className="text-sm text-white mb-1">Date</label>
        <input
          type="date"
          name="date"
          value={form.date}
          onChange={handleChange}
          className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
          required
        />
      </div>
      <div className="flex flex-col w-28">
        <label className="text-sm text-white mb-1">Status</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="rounded-lg bg-[#23283a] border-none px-4 py-2 text-white"
        >
          <option value="Active">Active</option>
          <option value="Winner">Winner</option>
        </select>
      </div>
      <div className="flex flex-col items-center">
        <label className="text-sm text-white mb-1">Winner</label>
        <input
          type="checkbox"
          name="winner"
          checked={form.winner}
          onChange={handleChange}
          className="w-5 h-5"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-[#7c3bed] hover:bg-[#d54ff9] text-white px-6 py-2 rounded-lg font-semibold transition"
      >
        {loading ? "Saving..." : "Add Ticket"}
      </button>
    </form>
  );
}