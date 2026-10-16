export class ProductCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  static get observedAttributes() {
    return ['name', 'price', 'description', 'image-url'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const name = this.getAttribute('name') || 'Unknown Product';
    const price = this.getAttribute('price') || '0';
    const desc = this.getAttribute('description') || '';
    const imageUrl = this.getAttribute('image-url') || 'https://via.placeholder.com/150';

    this.shadowRoot.innerHTML = `
      <style>
        .product-card {
          background: white; 
          border-radius: 14px; 
          overflow: hidden; 
          border: 1px solid #f0f0f0;
          transition: transform 0.2s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.2s ease;
          cursor: pointer; 
          display: flex; 
          flex-direction: column;
          height: 100%;
          font-family: 'Be Vietnam Pro', 'Plus Jakarta Sans', sans-serif;
        }
        .product-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 8px 24px rgba(44,62,80,0.12); 
        }
        .product-image {
          width: 100%;
          height: 140px;
          object-fit: cover;
          background-color: #f9f9f9;
        }
        .product-content {
          padding: 12px;
          display: flex;
          flex-direction: column;
          flex-grow: 1;
        }
        .product-name {
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          margin: 0 0 4px 0;
        }
        .product-desc {
          font-size: 12px;
          color: #64748b;
          margin: 0 0 8px 0;
          flex-grow: 1;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .product-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: auto;
        }
        .product-price {
          font-weight: 700;
          color: #064e3b;
          font-size: 14px;
        }
        .add-btn {
          background: #064e3b;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 6px 12px;
          font-weight: 600;
          font-size: 12px;
          cursor: pointer;
          transition: background 0.2s;
        }
        .add-btn:hover {
          background: #065f46;
        }
      </style>
      
      <div class="product-card">
        <img src="${imageUrl}" class="product-image" alt="${name}" loading="lazy" />
        <div class="product-content">
          <h3 class="product-name">${name}</h3>
          <p class="product-desc">${desc}</p>
          <div class="product-footer">
            <span class="product-price">${price} TSh</span>
            <button class="add-btn">Add</button>
          </div>
        </div>
      </div>
    `;

    // Add event listener to the button
    const btn = this.shadowRoot.querySelector('.add-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.dispatchEvent(new CustomEvent('add-to-cart', {
          detail: {
            id: this.getAttribute('product-id'),
            name: this.getAttribute('name'),
            price: this.getAttribute('price'),
            imageUrl: this.getAttribute('image-url'),
            sellerId: this.getAttribute('seller-id'),
            sellerName: this.getAttribute('seller-name')
          },
          bubbles: true,
          composed: true
        }));
      });
    }
  }
}

// Register the component
if (!customElements.get('smartsoko-product-card')) {
  customElements.define('smartsoko-product-card', ProductCard);
}
