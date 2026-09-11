export const getActiveTablesView = ({ loading, error, tables }) => {
  if (loading) return 'loading';
  if (error) return 'error';
  if (!Array.isArray(tables) || tables.length === 0) return 'empty';
  return 'ready';
};

export const tableCardLabel = (table) =>
  `Table ${table.tableNumber} - ${table.seatingCapacity} ${table.seatingCapacity === 1 ? 'seat' : 'seats'}`;
