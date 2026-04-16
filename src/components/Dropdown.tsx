import { useState } from "react";
import { HiChevronDown, HiChevronUp } from "react-icons/hi2";

type DropdownProps = {
  dropdownTitle: string;
  children: React.ReactNode;
  /** Stable id for accordion grouping (use with accordionOpen + onAccordionChange). */
  accordionId?: string;
  accordionOpen?: string | null;
  onAccordionChange?: (id: string | null) => void;
};

const Dropdown = ({
  dropdownTitle,
  children,
  accordionId,
  accordionOpen,
  onAccordionChange,
}: DropdownProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const controlled =
    accordionId != null &&
    accordionOpen !== undefined &&
    onAccordionChange != null;
  const isOpen = controlled
    ? accordionOpen === accordionId
    : internalOpen;

  const toggle = () => {
    if (controlled) {
      onAccordionChange(isOpen ? null : accordionId);
    } else {
      setInternalOpen((prev) => !prev);
    }
  };

  return (
    <div>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between border-b border-black/30 bg-transparent py-0 text-left h-14"
        onClick={toggle}
        aria-expanded={isOpen}
      >
        <p className="text-black/95 text-base">{dropdownTitle}</p>
        {isOpen ? (
          <HiChevronUp className="text-base shrink-0" aria-hidden />
        ) : (
          <HiChevronDown className="text-base shrink-0" aria-hidden />
        )}
      </button>
      {isOpen && (
        <div className="mt-4">
          <p className="text-sm">{children}</p>
        </div>
      )}
    </div>
  );
};
export default Dropdown;
