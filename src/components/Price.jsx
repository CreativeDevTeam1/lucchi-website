import { formatAmount, formatPrice } from '../data/content'

/* The price line: "19,000 EGP", or with a discount "27,000 (struck through, muted) 19,000 EGP".
   Renders nothing without a price, so a piece without one looks exactly as before. */
export default function Price({ price, compareAt, className = '' }) {
  if (!price) return null
  const was = compareAt && compareAt > price ? compareAt : null
  return (
    <p className={`price-line ${className}`.trim()}>
      {was ? (
        <del className="price-was">
          <span className="price-sr">Price before discount </span>
          {formatAmount(was)}
        </del>
      ) : null}
      <span className="price-now">
        {was ? <span className="price-sr">Now </span> : null}
        {formatPrice(price)}
      </span>
    </p>
  )
}
