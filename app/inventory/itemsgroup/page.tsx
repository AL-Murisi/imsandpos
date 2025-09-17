import ItemDropdown from "../../../components/items/dropDown";

import AddNewItemPage from "./new/page";
import CardContainer from "../../../components/common/CardContainer";

export default function Group() {
  return (
    <div>
      <CardContainer
        title="Products"
        total={0}
        action={<AddNewItemPage />}
        children={undefined}
      >
        {/* <Table /> */}
      </CardContainer>
      <div className="p-2 mb-3 flex justify-between items-center  ">
        <ItemDropdown />
        <AddNewItemPage />
      </div>
    </div>
  );
}
