"use client";

import { Children } from "react";
import ScrollRail from "./ScrollRail";

export default function CardCarousel({ label, children }) {
  const cards = Children.toArray(children);
  return (
    <ScrollRail label={label} className="card-carousel" viewportClassName="carousel-viewport" controls={cards.length > 1} role="region">
      {cards.map((card, index) => (
        <div className="carousel-item" key={card.key || index} role="group" aria-label={`Tarjeta ${index + 1} de ${cards.length}`}>
          {card}
        </div>
      ))}
    </ScrollRail>
  );
}
