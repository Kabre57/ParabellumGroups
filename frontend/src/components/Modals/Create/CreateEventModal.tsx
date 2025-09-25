import { useState } from "react";
import { createEvent } from "../../../api/calendar";

export default function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");

  const handleSubmit = async () => {
    await createEvent({ title });
    onClose();
  };

  return (
    <div className="modal">
      <h2>Create Event</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
