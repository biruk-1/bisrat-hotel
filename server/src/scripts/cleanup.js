const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Create a database connection
const db = new sqlite3.Database(path.join(__dirname, '../pos.db'), (err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    process.exit(1);
  }
  console.log('Connected to the database');
});

// Start a transaction
db.serialize(() => {
  db.run('BEGIN TRANSACTION');

  // Delete order items first (due to foreign key constraints)
  db.run(`DELETE FROM order_items`, function(err) {
    if (err) {
      console.error('Error deleting order items:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} order items`);
  });

  // Delete orders
  db.run(`DELETE FROM orders`, function(err) {
    if (err) {
      console.error('Error deleting orders:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log(`Deleted ${this.changes} orders`);
  });

  // Reset the auto-increment counter for both tables
  db.run(`DELETE FROM sqlite_sequence WHERE name='orders' OR name='order_items'`, function(err) {
    if (err) {
      console.error('Error resetting auto-increment:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('Reset auto-increment counters');
  });

  // Commit the transaction
  db.run('COMMIT', (err) => {
    if (err) {
      console.error('Error committing transaction:', err);
      db.run('ROLLBACK');
      process.exit(1);
    }
    console.log('Cleanup completed successfully!');
    db.close();
  });
}); 