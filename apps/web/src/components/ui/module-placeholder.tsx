"use client";

import { useState } from "react";

type ModulePlaceholderProps = {
  title: string;
  description: string;
  fields: string[];
};

export function ModulePlaceholder({ title, description, fields }: ModulePlaceholderProps) {
  const [query, setQuery] = useState("");

  return (
    <section className="dataPanel modulePanel">
      <div className="dataHead">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="primary" type="button" disabled title="Available after this module is implemented">
          ＋ Create new
        </button>
      </div>
      <div className="tableTools">
        <label>
          <span>⌕</span>
          <input
            aria-label={`Search ${title.toLowerCase()}`}
            placeholder={`Search ${title.toLowerCase()}...`}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <button type="button" onClick={() => setQuery("")}>Reset</button>
      </div>
      <div className="placeholderTable">
        <div className="placeholderHeader">{fields.map((field) => <span key={field}>{field}</span>)}</div>
        <div className="placeholderEmpty">
          <b>No live data available</b>
          <p>Start the backend and connect the API to display {title.toLowerCase()} data.</p>
        </div>
      </div>
    </section>
  );
}
