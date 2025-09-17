import ItemDropdown from "../../../components/items/dropDown";

import AddNewItemPage from "./new/page";
import CardContainer from "../../../components/common/CardContainer";

export default function Group() {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between p-2">
        <ItemDropdown />
        <AddNewItemPage />
      </div>
    </div>
  );
}
