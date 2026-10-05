import { useEffect, useState } from "react";
import { displayManager } from "./services/displayManager";
import {emit} from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import DevInfo from "./componenets/devInfo";
export default function MyApp () {

  const [isActive, setActive] = useState({
    "isPrimary":true,
    "isSecondry":false
  });

  const [petSize, setPetSize] = useState(200);



  const setBilotiVisible = async (visible) => {
      await emit("biloti-visibility", visible);
      setActive(prev=> ({
        ...prev,
        isPrimary: visible
      }))
  
  };

  
  return(
        <div className="settings-app">
      <aside className="sidebar">
        <div className="app-title">
          <div className="app-icon">🐾</div>

          <div>
            <h1>Desktop Pet</h1>
            <span>Settings</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className="nav-item active">
            <span>🐾</span>
            Pet
          </button>

          <button disabled className="nav-item cursor-not-allowed!">
            <span>🖥️</span>
            Displays
          </button>

          <button className="nav-item cursor-not-allowed!">
            <span>⚙️</span>
            Behavior
          </button>

          <button className="nav-item cursor-not-allowed!">
            <span>🎨</span>
            Appearance
          </button>
          
          
        </nav>
          <div className="aboutDev h-auto w-full">
            <DevInfo/>
          </div>
      </aside>

      <main className="settings-content">
        <header className="settings-header">
          <h2>Pet</h2>
          <p>Customize your desktop companion.</p>
        </header>

        <section className="settings-section">
          <h3>Animal</h3>Jatt di biLoti 

          <div className="setting-row">
            <div>
              <strong>Pet</strong>
              <span>Choose your desktop companion.</span>
            </div>

            <select defaultValue="cat">
              <option value="cat">Cat</option>
              <option disabled value="fox">Fox</option>
              <option disabled value="dot">Dot</option>
            </select>
          </div>

          <div className="setting-row">
            <div>
              <strong>Size</strong>
              <span>Control the size of your pet.</span>
            </div>

            <input
                type="range"
                min="50"
                max="400"
                value={petSize}
                onChange={(e) => {
                    const size = Number(e.target.value);
                    setPetSize(size);
                    emit("biloti-size", size);
                }}
            />

            <span>{petSize}px</span>
          </div>
        </section>

        <section className="settings-section">
          <h3>Display</h3>

          <div className="setting-row">
            <div>
              <strong>Primary display</strong>
              <span>Show a pet on your main display.</span>
            </div>

            <div onClick={()=> setBilotiVisible(!isActive.isPrimary)} className={`toggle-btn ${isActive.isPrimary ? "active" : ""}`}>
                <div/>
            </div>
          </div>

          {/* <div className="setting-row">
            <div>
              <strong>Secondary display</strong>
              <span>Show another pet on your second display.</span>
            </div>

            <div className={`toggle-btn`}>
              <div/>
            </div>
          </div> */}
        </section>
      </main>
    </div>
  )
}

