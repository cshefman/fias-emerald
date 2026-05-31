import { IconChevronRight } from "@tabler/icons-react";
import { config } from "../config";

interface Props {
  aurum: number;
  level: number;
  onManage: () => void;
}

export function Header({ aurum, level, onManage }: Props) {
  return (
    <div className="hdr">
      <div className="who">
        <h1 style={{ whiteSpace: "nowrap" }}>Fia's Emerald</h1>
        <p>Lvl {level} {config.character.class}</p>
      </div>
      <button className="aurum" onClick={onManage} title="Manage Aurum & tiers">
        <span className="pip" />
        {aurum}
        <small>Aurum</small>
        <IconChevronRight size={14} style={{ opacity: 0.7 }} />
      </button>
    </div>
  );
}
