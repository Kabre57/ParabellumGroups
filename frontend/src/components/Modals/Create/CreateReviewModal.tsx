import { useState } from "react";
import { createReview } from "../../../api/performance";

export default function CreateReviewModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState("");

  const handleSubmit = async () => {
    await createReview({ title });
    onClose();
  };

  return (
    <div className="modal">
      <h2>Create Review</h2>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
      <button onClick={handleSubmit}>Save</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
