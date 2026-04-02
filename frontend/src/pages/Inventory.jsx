import { useEffect, useState } from "react";
import InventoryTable from "../components/jobcard/InventoryTable";
import SectionCard from "../components/shared/SectionCard";
import { getInventory } from "../services/inventoryService";

export default function Inventory() {
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    getInventory().then((data) => setInventory(data.items));
  }, []);

  return (
    <main className="app-shell space-y-6">
      <SectionCard title="Inventory" subtitle="Full workshop stock view with source / godown and availability details">
        <InventoryTable items={inventory} />
      </SectionCard>
    </main>
  );
}
