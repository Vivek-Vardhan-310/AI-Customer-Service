import { useMemo, useState } from 'react';
import Icon from '../components/ui/Icon';

export default function MyProductsPage({ products, loading, onSelectProduct }) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return products;

    return products.filter(product => {
      const searchableText = `${product.name} ${product.serial}`.toLowerCase();
      return searchableText.includes(query);
    });
  }, [products, searchQuery]);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Products</h1>
          <p>Track your registered devices</p>
        </div>
      </div>
      <div className="products-search">
        <span className="search-icon"><Icon name="search" size={18} /></span>
        <input
          type="text"
          placeholder="Search your devices"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </div>
      {loading && (
        <div className="empty-state"><p>Loading products...</p></div>
      )}
      {!loading && products.length === 0 && (
        <div className="empty-state"><p>No products registered yet. Add your first device to get started.</p></div>
      )}
      {!loading && products.length > 0 && filteredProducts.length === 0 && (
        <div className="empty-state"><p>No devices match your search.</p></div>
      )}
      {!loading && filteredProducts.map(product => (
        <div key={product.id} className="product-card" onClick={() => onSelectProduct(product)}>
          <img src={product.image} alt={product.name} className="product-card-img" />
          <div className="product-card-info">
            <div className="product-card-name">{product.name}</div>
            <div className="product-card-serial">Serial No: {product.serial}</div>
            <div className="product-card-badges">
              <span className={`badge ${product.warranty === 'Active' ? 'badge-green' : 'badge-amber'}`}>{product.warranty}</span>
              {product.amc !== 'Inactive' && <span className={`badge ${product.amc === 'Active' ? 'badge-green' : 'badge-amber'}`}>AMC {product.amc}</span>}
            </div>
          </div>
          <Icon name="chevron-right" size={20} color="#8a8a8a" />
        </div>
      ))}
    </div>
  );
}
