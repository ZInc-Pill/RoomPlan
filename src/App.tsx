import { PreviewBoundary } from './components/PreviewBoundary';
import { browserProjectStore } from './utils/localProjectStore';
import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

import { MousePointer2, PenTool, Layers, MessageSquare, Ruler, ListTree, Keyboard } from 'lucide-react';
import { Toolbar } from './components/Toolbar';
import { Canvas2D } from './components/Canvas2D';
const Canvas3D = lazy(() => import('./components/Canvas3D').then(module => ({ default: module.Canvas3D })));
import { AppMode, Wall, PlacedItem, Floor, CommentType } from './types';
import { ITEM_CATALOG } from './catalog';

import { PropertiesPanel } from './components/PropertiesPanel';
import { MobileHeader } from './components/MobileHeader';
import { MobileBottomDock } from './components/MobileBottomDock';
import { Mobile3DControlDeck } from './components/Mobile3DControlDeck';
import { MobileCatalogDrawer } from './components/MobileCatalogDrawer';
import { MobileInspectorDrawer } from './components/MobileInspectorDrawer';
import { MobileLayersDrawer } from './components/MobileLayersDrawer';
import { MobileActionsMenu } from './components/MobileActionsMenu';
import { ExportScreenshotModal } from './components/ExportScreenshotModal';
import { sanitizeClonedDocument } from './utils/screenshotUtils';
import { isInteractiveElement } from './utils/input';
import { useDocumentHistory } from './hooks/useDocumentHistory';
import { useProjectAutosave } from './hooks/useProjectAutosave';
import { parseProject, serializeProject, PROJECT_LIMIT, BACKUP_KEY } from './utils/projectFile';
import { attachNearestOpening, isOpening } from './utils/openingAttachment';
import { updateConnectedWall } from './utils/wallConnections';
import { getGridSize } from './utils/coordinates';
import { emptyDocument, type PlanDocument } from './utils/documentHistory';

export default function App() {
  const { state: documentState, update: updateDocument, undo: handleUndo, redo: handleRedo } = useDocumentHistory();
  const { walls, floors, items, comments } = documentState.present;
  const saveStatus = useProjectAutosave(documentState.present, Boolean(documentState.start));
  const [projectError, setProjectError] = useState<string | null>(null);
  const historyIndex = documentState.past.length;
  const history = { length: historyIndex + 1 + documentState.future.length };
  const [gridOption, setGridOption] = useState<1 | 2 | 3>(1);
  const [mode, setMode] = useState<AppMode>('SELECT');
  const [view3D, setView3D] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null);

  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 767px)').matches);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 767px)');
    const changed = () => { setIsMobile(query.matches); if (!query.matches) setActivePanel(null); };
    query.addEventListener('change', changed);
    return () => query.removeEventListener('change', changed);
  }, []);

  // Modals & Drawers State
  const [activePanel, setActivePanel] = useState<'catalog' | 'layers' | 'inspector' | 'menu' | null>(null);
  const isCatalogOpen = activePanel === 'catalog';
  const isLayersOpen = activePanel === 'layers';
  const isInspectorOpen = activePanel === 'inspector';
  const isMenuOpen = activePanel === 'menu';
  const panelSetter = (panel: typeof activePanel) => (open: boolean) =>
    setActivePanel(current => open ? panel : current === panel ? null : current);
  const setIsCatalogOpen = panelSetter('catalog');
  const setIsLayersOpen = panelSetter('layers');
  const setIsInspectorOpen = panelSetter('inspector');
  const setIsMenuOpen = panelSetter('menu');
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  
  // Clipboard state
  const [clipboard, setClipboard] = useState<{ type: 'item' | 'wall' | 'floor' | 'comment'; data: any } | null>(null);

  // 3D Camera & Focus State
  const [cameraPreset3D, setCameraPreset3D] = useState<'perspective' | 'walk' | 'isometric'>('perspective');
  const [focusTarget3D, setFocusTarget3D] = useState<[number, number, number] | null>(null);

  const mainRef = useRef<HTMLDivElement>(null);

  function updateCollection<K extends keyof PlanDocument>(key: K, value: PlanDocument[K] | ((previous: PlanDocument[K]) => PlanDocument[K])) {
    updateDocument(document => ({ ...document, [key]: typeof value === 'function' ? value(document[key]) : value }));
  }
  const handleSetWalls = (value: Wall[] | ((previous: Wall[]) => Wall[])) => updateCollection('walls', value);
  const handleSetFloors = (value: Floor[] | ((previous: Floor[]) => Floor[])) => updateCollection('floors', value);
  const handleSetItems = (value: PlacedItem[] | ((previous: PlacedItem[]) => PlacedItem[])) => updateCollection('items', value);
  const handleSetComments = (value: CommentType[] | ((previous: CommentType[]) => CommentType[])) => updateCollection('comments', value);

  const handleDelete = () => {
    updateDocument(document => ({
      walls: document.walls.filter(w => w.id !== selectedWallId),
      floors: document.floors.filter(f => f.id !== selectedFloorId),
      items: document.items.filter(i => !selectedItemIds.includes(i.id)),
      comments: document.comments.filter(c => c.id !== selectedCommentId),
    }));
    setSelectedItemIds([]);
    setSelectedWallId(null);
    setSelectedFloorId(null);
    setSelectedCommentId(null);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (isInteractiveElement(e.target) || activePanel || isShortcutsOpen || isScreenshotModalOpen) return;

    const key = e.key.toLowerCase();
    
    if ((e.metaKey || e.ctrlKey) && key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        handleRedo();
      } else {
        handleUndo();
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && key === 's') {
      e.preventDefault();
      handleSave();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && key === 'c') {
      if (selectedItemIds.length === 1) {
        const item = items.find(i => i.id === selectedItemIds[0]);
        if (item) setClipboard({ type: 'item', data: item });
      } else if (selectedWallId) {
        const wall = walls.find(w => w.id === selectedWallId);
        if (wall) setClipboard({ type: 'wall', data: wall });
      } else if (selectedFloorId) {
        const floor = floors.find(f => f.id === selectedFloorId);
        if (floor) setClipboard({ type: 'floor', data: floor });
      } else if (selectedCommentId) {
        const comment = comments.find(c => c.id === selectedCommentId);
        if (comment) setClipboard({ type: 'comment', data: comment });
      }
      return;
    }

    if ((e.metaKey || e.ctrlKey) && key === 'v') {
      if (clipboard) {
        const newId = Math.random().toString(36).substr(2, 9);
        if (clipboard.type === 'item') {
          const newItem = { ...clipboard.data, id: newId, x: clipboard.data.x + 20, y: clipboard.data.y + 20 };
          handleSetItems(prev => [...prev, newItem]);
          setSelectedItemIds([newId]);
        } else if (clipboard.type === 'wall') {
          const newWall = { 
            ...clipboard.data, 
            id: newId, 
            start: { x: clipboard.data.start.x + 20, y: clipboard.data.start.y + 20 },
            end: { x: clipboard.data.end.x + 20, y: clipboard.data.end.y + 20 }
          };
          handleSetWalls(prev => [...prev, newWall]);
          setSelectedWallId(newId);
        } else if (clipboard.type === 'floor') {
          const newFloor = {
            ...clipboard.data,
            id: newId,
            points: clipboard.data.points.map((p: any) => ({ x: p.x + 20, y: p.y + 20 }))
          };
          handleSetFloors(prev => [...prev, newFloor]);
          setSelectedFloorId(newId);
        } else if (clipboard.type === 'comment') {
          const newComment = { ...clipboard.data, id: newId, x: clipboard.data.x + 20, y: clipboard.data.y + 20 };
          handleSetComments(prev => [...prev, newComment]);
          setSelectedCommentId(newId);
        }
      }
      return;
    }

    if (view3D) return; // View-specific actions are owned by Canvas3D.

    switch (key) {
      case 'v': setMode('SELECT'); break;
      case 'w': setMode('DRAW_WALL'); break;
      case 'f': setMode('DRAW_FLOOR'); break;
      case 'c': setMode('COMMENT'); break;
      case 'm': setMode('RULER'); break;
      case 'escape': 
        setMode('SELECT');
        setSelectedItemIds([]);
        setSelectedWallId(null);
        setSelectedFloorId(null);
        setSelectedCommentId(null);
        break;
      case 'delete':
      case 'backspace':
        handleDelete();
        break;
      case 'r':
        if (selectedItemIds.length > 0) {
          handleSetItems(prev => prev.map(i => selectedItemIds.includes(i.id) ? { ...i, rotation: ((Number.isFinite(i.rotation) ? i.rotation : 0) + Math.PI / 4) % (Math.PI * 2) } : i));
        }
        break;
    }
  };

  const handleKeyDownRef = useRef(handleKeyDown);
  handleKeyDownRef.current = handleKeyDown;

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handleKeyDownRef.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  const handleAddItem = (typeId: string) => {
    const typeInfo = ITEM_CATALOG.find(i => i.id === typeId);
    const newItem: PlacedItem = {
      id: Math.random().toString(36).substr(2, 9),
      typeId,
      x: 300,
      y: 300,
      rotation: 0,
      width: typeInfo?.width ?? 90,
      depth: typeInfo?.depth ?? 60,
      height: typeInfo?.height ?? 100,
      elevation: 0
    };
    handleSetItems(prev => [...prev, newItem]);
    setMode('SELECT');
    setSelectedItemIds([newItem.id]);
    setSelectedWallId(null);
    setSelectedFloorId(null);
  };

  const handleUpdateItem = (id: string, updates: Partial<PlacedItem>) => {
    handleSetItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  };

  const handleUpdateWall = (id: string, updates: Partial<Wall>) => {
    handleSetWalls(prev => updateConnectedWall(prev, id, updates));
  };

  const handleUpdateFloor = (id: string, updates: Partial<Floor>) => {
    handleSetFloors(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleDeleteItem = (id: string) => {
    handleSetItems(prev => prev.filter(i => i.id !== id));
    setSelectedItemIds(prev => prev.filter(itemId => itemId !== id));
  };

  const handleDeleteWall = (id: string) => {
    handleSetWalls(prev => prev.filter(w => w.id !== id));
    if (selectedWallId === id) setSelectedWallId(null);
  };

  const handleDeleteFloor = (id: string) => {
    handleSetFloors(prev => prev.filter(f => f.id !== id));
    if (selectedFloorId === id) setSelectedFloorId(null);
  };

  const handleDeleteComment = (id: string) => {
    handleSetComments(prev => prev.filter(c => c.id !== id));
    if (selectedCommentId === id) setSelectedCommentId(null);
  };

  const handleRotateSelected = (angleDelta?: number | unknown) => {
    // If angleDelta is not a finite number (e.g. if invoked by onClick without an arrow function), default to 45 degrees
    const delta = (typeof angleDelta === 'number' && Number.isFinite(angleDelta)) ? angleDelta : Math.PI / 4;
    if (selectedItemIds.length > 0) {
      handleSetItems(prev => prev.map(i => {
        if (!selectedItemIds.includes(i.id)) return i;
        const currentRot = Number.isFinite(i.rotation) ? i.rotation : 0;
        const nextRot = (((currentRot + delta) % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);
        return { ...i, rotation: nextRot };
      }));
    } else if (selectedWallId) {
      handleSetWalls(prev => {
        const wall = prev.find(w => w.id === selectedWallId);
        if (!wall) return prev;
        const cx = (wall.start.x + wall.end.x) / 2, cy = (wall.start.y + wall.end.y) / 2;
        const rotate = (p: { x: number; y: number }) => ({
          x: cx + (p.x - cx) * Math.cos(delta) - (p.y - cy) * Math.sin(delta),
          y: cy + (p.x - cx) * Math.sin(delta) + (p.y - cy) * Math.cos(delta),
        });
        return updateConnectedWall(prev, wall.id, { start: rotate(wall.start), end: rotate(wall.end) });
      });
    } else if (selectedFloorId) {
      // Rotate floor polygon around its centroid
      handleSetFloors(prev => prev.map(f => {
        if (f.id !== selectedFloorId || f.points.length === 0) return f;
        const cx = f.points.reduce((sum, p) => sum + p.x, 0) / f.points.length;
        const cy = f.points.reduce((sum, p) => sum + p.y, 0) / f.points.length;
        const cos = Math.cos(delta);
        const sin = Math.sin(delta);
        return {
          ...f,
          points: f.points.map(p => ({
            x: Math.round(cx + (p.x - cx) * cos - (p.y - cy) * sin),
            y: Math.round(cy + (p.x - cx) * sin + (p.y - cy) * cos)
          }))
        };
      }));
    }
  };

  const handleElevateSelected = (deltaCm: number) => {
    if (selectedItemIds.length > 0) {
      handleSetItems(prev => prev.map(i => {
        if (!selectedItemIds.includes(i.id)) return i;
        const currentElev = Number.isFinite(i.elevation) ? i.elevation! : 0;
        return { ...i, elevation: Math.max(0, currentElev + deltaCm) };
      }));
    }
  };

  // Universal Nudge Handler: moves selected item(s), wall, or floor smoothly
  const handleNudgeSelected = (dx: number, dy: number) => {
    if (selectedItemIds.length > 0) {
      handleSetItems(prev => prev.map(i => selectedItemIds.includes(i.id) ? { ...i, x: i.x + dx, y: i.y + dy } : i));
    } else if (selectedWallId) {
      handleNudgeWall(selectedWallId, dx, dy);
    } else if (selectedFloorId) {
      handleSetFloors(prev => prev.map(f => f.id === selectedFloorId ? {
        ...f,
        points: f.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
      } : f));
    }
  };

  const handleNudgeItem = (id: string | undefined, dx: number, dy: number) => {
    if (!id) return;
    handleSetItems(prev => prev.map(i => i.id === id ? { ...i, x: i.x + dx, y: i.y + dy } : i));
  };

  const handleNudgeWall = (id: string | undefined, dx: number, dy: number) => {
    if (!id) return;
    handleSetWalls(prev => {
      const wall = prev.find(w => w.id === id);
      if (!wall) return prev;
      return updateConnectedWall(prev, id, {
        start: { x: wall.start.x + dx, y: wall.start.y + dy },
        end: { x: wall.end.x + dx, y: wall.end.y + dy },
      });
    });
  };

  const handleNudgeFloor = (id: string | undefined, dx: number, dy: number) => {
    if (!id) return;
    handleSetFloors(prev => prev.map(f => f.id === id ? {
      ...f,
      points: f.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
    } : f));
  };

  const handleFocusSelection3D = () => {
    if (selectedItemIds.length === 1) {
      const item = items.find(i => i.id === selectedItemIds[0]);
      if (item) {
        setFocusTarget3D([item.x, (item.elevation || 0) * 0.4, item.y]);
      }
    } else if (selectedWallId) {
      const wall = walls.find(w => w.id === selectedWallId);
      if (wall) {
        setFocusTarget3D([
          (wall.start.x + wall.end.x) / 2,
          50,
          (wall.start.y + wall.end.y) / 2
        ]);
      }
    } else if (selectedFloorId) {
      const floor = floors.find(f => f.id === selectedFloorId);
      if (floor && floor.points.length > 0) {
        const avgX = floor.points.reduce((sum, p) => sum + p.x, 0) / floor.points.length;
        const avgY = floor.points.reduce((sum, p) => sum + p.y, 0) / floor.points.length;
        setFocusTarget3D([avgX, 20, avgY]);
      }
    }
  };

  const handleDuplicateSelected = () => {
    if (selectedItemIds.length > 0) {
      const clonedItems: PlacedItem[] = [];
      const clonedIds: string[] = [];
      selectedItemIds.forEach(id => {
        const item = items.find(i => i.id === id);
        if (item) {
          const newId = Math.random().toString(36).substr(2, 9);
          clonedItems.push({
            ...item,
            id: newId,
            x: item.x + 30,
            y: item.y + 30,
            rotation: Number.isFinite(item.rotation) ? item.rotation : 0,
            width: Number.isFinite(item.width) ? item.width : 90,
            depth: Number.isFinite(item.depth) ? item.depth : 60,
            height: Number.isFinite(item.height) ? item.height : 100,
            elevation: Number.isFinite(item.elevation) ? item.elevation : 0,
          });
          clonedIds.push(newId);
        }
      });
      if (clonedItems.length > 0) {
        handleSetItems(prev => [...prev, ...clonedItems]);
        setSelectedItemIds(clonedIds);
      }
    } else if (selectedWallId) {
      const wall = walls.find(w => w.id === selectedWallId);
      if (wall) {
        const newId = Math.random().toString(36).substr(2, 9);
        const newWall = {
          ...wall,
          id: newId,
          start: { x: wall.start.x + 20, y: wall.start.y + 20 },
          end: { x: wall.end.x + 20, y: wall.end.y + 20 },
        };
        handleSetWalls(prev => [...prev, newWall]);
        setSelectedWallId(newId);
      }
    } else if (selectedFloorId) {
      const floor = floors.find(f => f.id === selectedFloorId);
      if (floor) {
        const id = crypto.randomUUID();
        handleSetFloors(previous => [...previous, { ...floor, id, points: floor.points.map(point => ({ x: point.x + 20, y: point.y + 20 })) }]);
        setSelectedFloorId(id);
      }
    }
  };

  const handleClear = () => {
    updateDocument(() => emptyDocument());
    setSelectedCommentId(null);
    setSelectedItemIds([]);
    setSelectedWallId(null);
    setSelectedFloorId(null);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > PROJECT_LIMIT) { setProjectError('Project is too large (maximum 5 MB).'); return; }
    const reader = new FileReader();
    reader.onerror = () => setProjectError('Could not read this file. Your current plan is unchanged.');
    reader.onload = (event) => {
      try {
        const data = parseProject(event.target?.result as string);
        updateDocument(() => data);
        setProjectError(null);
        setSelectedItemIds([]);
        setSelectedWallId(null);
        setSelectedFloorId(null);
        setSelectedCommentId(null);
      } catch (err) {
        setProjectError((err instanceof Error ? err.message : 'Invalid project.') + ' Your current plan is unchanged.');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSave = () => {
    const data = serializeProject({ walls, floors, items, comments });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roomplan.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCaptureScreenshotBlob = async (): Promise<Blob | null> => {
    if (!mainRef.current) return null;

    // 1. In 3D view: Capture WebGL canvas directly (supported via preserveDrawingBuffer: true)
    if (view3D) {
      const webglCanvas = mainRef.current.querySelector('canvas');
      if (webglCanvas) {
        return new Promise<Blob | null>((resolve) => {
          webglCanvas.toBlob((blob) => resolve(blob), 'image/png');
        });
      }
    }

    // 2. In 2D view: use html2canvas with full oklch and modern CSS color sanitization
    try {
      const canvas = await (await import('html2canvas')).default((mainRef.current.querySelector('[data-scene]') as HTMLElement) || mainRef.current, {
        backgroundColor: '#F8FAFC',
        ignoreElements: element => element.tagName === 'BUTTON' || element.hasAttribute('data-editor-control'),
        useCORS: true,
        logging: false,
        scale: Math.min(2, window.devicePixelRatio || 1.5),
        onclone: (clonedDoc, clonedElement) => {
          sanitizeClonedDocument(clonedDoc, clonedElement);
        },
      });

      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => resolve(blob), 'image/png');
      });
    } catch (err) {
      console.warn('html2canvas capture failed, falling back to SVG snapshot:', err);
      // 3. Fallback: direct SVG rasterization
      const svg = mainRef.current.querySelector('svg');
      if (svg) {
        return new Promise<Blob | null>((resolve) => {
          try {
            const svgData = new XMLSerializer().serializeToString(svg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = svg.clientWidth || 1000;
              canvas.height = svg.clientHeight || 700;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#F8FAFC';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((b) => {
                  URL.revokeObjectURL(url);
                  resolve(b);
                }, 'image/png');
              } else {
                URL.revokeObjectURL(url);
                resolve(null);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              resolve(null);
            };
            img.src = url;
          } catch (e) {
            resolve(null);
          }
        });
      }
      return null;
    }
  };

  const handleScreenshot = () => {
    setIsScreenshotModalOpen(true);
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] font-sans text-slate-800 overflow-hidden relative">
      {/* Mobile Top Header */}
      <MobileHeader 
        view3D={view3D}
        setView3D={setView3D}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenMenu={() => setIsMenuOpen(true)}
      />

      {/* Desktop Top Header */}
      <header className="hidden md:flex items-center justify-between px-6 h-16 bg-white border-b border-slate-200 shadow-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-indigo-200 shadow-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"></path></svg>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">RoomPlan <span className="text-indigo-500">Pro</span></h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200 mr-2">
            <button 
              onClick={() => setView3D(false)}
              className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-colors ${!view3D ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              2D Layout
            </button>
            <button 
              onClick={() => setView3D(true)}
              className={`px-6 py-1.5 rounded-full text-sm font-semibold transition-colors ${view3D ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              3D Preview
            </button>
          </div>
          <button onClick={handleUndo} disabled={historyIndex === 0} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500" title="Undo (Ctrl+Z)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path></svg>
          </button>
          <button onClick={handleRedo} disabled={historyIndex === history.length - 1} className="p-2 text-slate-500 hover:text-slate-900 disabled:opacity-30 disabled:hover:text-slate-500" title="Redo (Ctrl+Shift+Z)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"></path></svg>
          </button>
          <input type="file" ref={fileInputRef} onChange={handleOpen} accept=".json" className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-slate-500 hover:text-slate-900" title="Open JSON">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"></path></svg>
          </button>
          <button onClick={handleSave} className="p-2 text-slate-500 hover:text-slate-900" title="Save JSON (Ctrl+S)">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
          </button>
          <button onClick={() => setIsShortcutsOpen(true)} className="p-2 text-slate-500 hover:text-slate-900" title="Keyboard Shortcuts">
            <Keyboard className="w-5 h-5" />
          </button>
          <button onClick={handleScreenshot} className="p-2 text-slate-500 hover:text-slate-900" title="Screenshot">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          </button>
          <button onClick={handleClear} className="ml-2 text-sm font-medium text-slate-500 hover:text-slate-900">Clear Plan</button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        <Toolbar 
          mode={mode}
          setMode={setMode}
          view3D={view3D}
          setView3D={setView3D}
          onAddItem={handleAddItem}
          onClear={handleClear}
          walls={walls}
          floors={floors}
          items={items}
          comments={comments}
          selectedItemIds={selectedItemIds}
          selectedWallId={selectedWallId}
          selectedFloorId={selectedFloorId}
          selectedCommentId={selectedCommentId}
          onSelect={(itemIds, wallId, floorId, commentId) => {
            setSelectedItemIds(itemIds);
            setSelectedWallId(wallId);
            setSelectedFloorId(floorId);
            setSelectedCommentId(commentId || null);
          }}
        />
        <main ref={mainRef} className="flex-1 relative bg-white flex items-center justify-center overflow-hidden">
          <div className="absolute top-28 md:top-16 left-2 z-20 max-w-[calc(100%-1rem)] rounded-lg bg-white/95 border border-slate-200 px-2 py-1 text-[11px] shadow-sm" data-editor-control>
            <span role="status">{saveStatus}</span>
            {documentState.error && <p role="alert" className="max-w-xs text-rose-700">{documentState.error}</p>}
            <button className="ml-2 underline min-h-8" onClick={() => {
              try {
                const backup = browserProjectStore().loadBackup();
                if (!backup) throw new Error('No previous saved version is available yet.');
                const restored = backup;
                updateDocument(() => restored);
                setSelectedItemIds([]); setSelectedWallId(null); setSelectedFloorId(null); setSelectedCommentId(null);
                setProjectError(null);
              } catch (error) { setProjectError(error instanceof Error ? error.message : 'Could not restore backup.'); }
            }}>Restore previous save</button>
            {selectedItemIds.length === 1 && items.filter(item => item.id === selectedItemIds[0] && isOpening(item)).map(item => <div key={item.id} className="border-t mt-1 pt-1">
              <span>{item.wallId ? 'Attached to wall · movement follows wall' : 'Door/window not attached'}</span>
              <button className="ml-2 underline min-h-9" onClick={() => {
                if (item.wallId) {
                  const { wallId, wallOffset, ...detached } = item;
                  handleSetItems(previous => previous.map(current => current.id === item.id ? detached : current));
                } else {
                  const attached = attachNearestOpening(item, walls);
                  if (!attached) { setProjectError('No wall is large enough for this opening.'); return; }
                  handleUpdateItem(item.id, attached);
                }
              }}>{item.wallId ? 'Detach' : 'Attach to nearest wall'}</button>
            </div>)}
            {projectError && <div role="alert" className="text-rose-700 max-w-xs">{projectError}<button className="ml-2 underline min-h-8" onClick={() => setProjectError(null)}>Dismiss</button></div>}
          </div>
          <div className="relative h-full min-w-0 flex-1" data-scene>
          {view3D ? (
            <PreviewBoundary onReturn={() => setView3D(false)}>
            <Suspense fallback={<div role="status" className="p-6 text-slate-600">Loading 3D preview…</div>}>
            <Canvas3D interactionBlocked={Boolean(activePanel) || isShortcutsOpen || isScreenshotModalOpen}
              walls={walls} 
              floors={floors} 
              items={items} 
              comments={comments}
              selectedItemIds={selectedItemIds}
              selectedWallId={selectedWallId}
              selectedFloorId={selectedFloorId}
              onSelect={(itemIds, wallId, floorId, commentId) => {
                setSelectedItemIds(itemIds);
                setSelectedWallId(wallId);
                setSelectedFloorId(floorId);
                setSelectedCommentId(commentId || null);
              }}
              onUpdateItem={handleUpdateItem}
              onUpdateWall={handleUpdateWall}
              onUpdateFloor={handleUpdateFloor}
              onDeleteItem={handleDelete}
              onDeleteWall={handleDelete}
              onDeleteFloor={handleDelete}
              onDuplicate={handleDuplicateSelected}
              onRotate={handleRotateSelected}
              onElevate={handleElevateSelected}
              onOpenInspector={() => setIsInspectorOpen(true)}
              cameraPreset={cameraPreset3D}
              onCameraPresetChange={setCameraPreset3D}
              focusTarget={focusTarget3D}
              onFocusTargetChange={setFocusTarget3D}
              isMobile={isMobile}
            />
            </Suspense>
            </PreviewBoundary>
          ) : (
            <Canvas2D gridOption={gridOption} setGridOption={setGridOption}
              walls={walls} 
              floors={floors}
              items={items}
              comments={comments}
              mode={mode} 
              selectedItemIds={selectedItemIds}
              selectedWallId={selectedWallId}
              selectedFloorId={selectedFloorId}
              selectedCommentId={selectedCommentId}
              onUpdateWalls={handleSetWalls}
              onUpdateFloors={handleSetFloors}
              onUpdateItems={handleSetItems}
              onUpdateComments={handleSetComments}
              setMode={setMode}
              onDuplicateFloor={() => handleDuplicateSelected()}
              onDeleteFloor={() => handleDelete()}
              onSelect={(itemIds, wallId, floorId, commentId) => {
                setSelectedItemIds(itemIds);
                setSelectedWallId(wallId);
                setSelectedFloorId(floorId);
                setSelectedCommentId(commentId || null);
              }}
              isDrawerOpen={Boolean(activePanel) || isShortcutsOpen || isScreenshotModalOpen}
            />
          )}

          {!view3D && (
            <div className="hidden md:flex absolute bottom-8 left-1/2 -translate-x-1/2 items-center bg-white shadow-2xl rounded-full border border-slate-200 p-2 z-20 gap-2 scale-125 origin-bottom">
              <div className="relative group">
                <button
                  onClick={() => setMode('SELECT')}
                  className={`flex items-center justify-center p-3 rounded-full transition-colors ${mode === 'SELECT' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <MousePointer2 className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Select <span className="text-slate-400 ml-1">V</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={() => setMode('DRAW_WALL')}
                  className={`flex items-center justify-center p-3 rounded-full transition-colors ${mode === 'DRAW_WALL' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <PenTool className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Draw Wall <span className="text-slate-400 ml-1">W</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={() => setMode('DRAW_FLOOR')}
                  className={`flex items-center justify-center p-3 rounded-full transition-colors ${mode === 'DRAW_FLOOR' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Layers className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Draw Floor <span className="text-slate-400 ml-1">F</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={() => setMode('COMMENT')}
                  className={`flex items-center justify-center p-3 rounded-full transition-colors ${mode === 'COMMENT' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Comment <span className="text-slate-400 ml-1">C</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={() => setMode('RULER')}
                  className={`flex items-center justify-center p-3 rounded-full transition-colors ${mode === 'RULER' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Ruler className="w-5 h-5" />
                </button>
                <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] font-bold rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  Measure <span className="text-slate-400 ml-1">M</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Mobile Layers Button (Top Left) */}
          <button
            onClick={() => setIsLayersOpen(true)}
            className="md:hidden absolute top-16 mt-2 left-3 flex items-center justify-center p-2.5 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-xl shadow-sm text-slate-600 z-10"
            title="Layers"
          >
            <ListTree className="w-5 h-5" />
            {(items.length > 0 || walls.length > 0 || floors.length > 0 || comments.length > 0) && (
              <span className="absolute -top-1 -right-1 bg-indigo-600 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-sm">
                {items.length + walls.length + floors.length + comments.length}
              </span>
            )}
          </button>

          </div>
          <PropertiesPanel 
            selectedItemIds={selectedItemIds}
            selectedWallId={selectedWallId}
            selectedFloorId={selectedFloorId}
            items={items}
            walls={walls}
            floors={floors}
            onUpdateItem={handleUpdateItem}
            onUpdateWall={handleUpdateWall}
            onUpdateFloor={handleUpdateFloor}
            onDelete={handleDelete}
            onDuplicate={handleDuplicateSelected}
          />
        </main>
      </div>

      {/* Mobile Bottom Dock or 3D Control Deck */}
      {view3D ? (
        <Mobile3DControlDeck isPanelOpen={Boolean(activePanel) || isScreenshotModalOpen}
          selectedItem={selectedItemIds.length === 1 ? items.find(i => i.id === selectedItemIds[0]) || null : null}
          selectedWall={selectedWallId ? walls.find(w => w.id === selectedWallId) || null : null}
          selectedFloor={selectedFloorId ? floors.find(f => f.id === selectedFloorId) || null : null}
          onNudgeItem={(dx, dy) => handleNudgeItem(selectedItemIds[0], dx, dy)}
          onNudgeWall={(dx, dy) => handleNudgeWall(selectedWallId || undefined, dx, dy)}
          onNudgeFloor={(dx, dy) => handleNudgeFloor(selectedFloorId || undefined, dx, dy)}
          onRotateItem={handleRotateSelected}
          onElevateItem={handleElevateSelected}
          onUpdateWall={handleUpdateWall}
          onUpdateFloor={handleUpdateFloor}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDelete}
          onOpenInspector={() => setIsInspectorOpen(true)}
          onDeselect={() => {
            setSelectedItemIds([]);
            setSelectedWallId(null);
            setSelectedFloorId(null);
          }}
          onOpenCatalog={() => setIsCatalogOpen(true)}
          onOpenLayers={() => setIsLayersOpen(true)}
          onCameraPreset={(preset) => {
            setFocusTarget3D(null);
            setCameraPreset3D(preset);
          }}
          onFocusSelection={handleFocusSelection3D}
          currentCameraPreset={cameraPreset3D}
          onSnapshot={handleScreenshot}
        />
      ) : (
        <MobileBottomDock gridSize={getGridSize(gridOption)}
          mode={mode}
          setMode={setMode}
          onOpenCatalog={() => setIsCatalogOpen(true)}
          onOpenLayers={() => setIsLayersOpen(true)}
          selectedItemIds={selectedItemIds}
          selectedWallId={selectedWallId}
          selectedFloorId={selectedFloorId}
          onRotate={handleRotateSelected}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDelete}
          itemCount={items.length}
          onOpenInspector={() => setIsInspectorOpen(true)}
          isInspectorOpen={isInspectorOpen || isCatalogOpen || isLayersOpen || isMenuOpen}
          onNudgeSelected={handleNudgeSelected}
        />
      )}

      {/* Mobile Drawers & Menus */}
      <MobileCatalogDrawer 
        isOpen={isCatalogOpen}
        onClose={() => setIsCatalogOpen(false)}
        onAddItem={(typeId) => {
          handleAddItem(typeId);
        }}
      />

      <MobileLayersDrawer 
        isOpen={isLayersOpen}
        onClose={() => setIsLayersOpen(false)}
        items={items}
        walls={walls}
        floors={floors}
        comments={comments}
        selectedItemIds={selectedItemIds}
        selectedWallId={selectedWallId}
        selectedFloorId={selectedFloorId}
        onSelect={(itemIds, wallId, floorId, commentId) => {
          setSelectedItemIds(itemIds);
          setSelectedWallId(wallId);
          setSelectedFloorId(floorId);
          setSelectedCommentId(commentId || null);
          if (itemIds.length > 0 || wallId || floorId) {
            setIsInspectorOpen(true);
          }
        }}
        onDeleteItem={handleDeleteItem}
        onDeleteWall={handleDeleteWall}
        onDeleteFloor={handleDeleteFloor}
        onDeleteComment={handleDeleteComment}
      />

      <MobileInspectorDrawer gridSize={getGridSize(gridOption)}
        isOpen={isInspectorOpen}
        onClose={() => setIsInspectorOpen(false)}
        selectedItemIds={selectedItemIds}
        selectedWallId={selectedWallId}
        selectedFloorId={selectedFloorId}
        items={items}
        walls={walls}
        floors={floors}
        onUpdateItem={handleUpdateItem}
        onUpdateWall={handleUpdateWall}
        onUpdateFloor={handleUpdateFloor}
        onDuplicate={handleDuplicateSelected}
        onRotate={handleRotateSelected}
        onDelete={handleDelete}
        onNudgeSelected={handleNudgeSelected}
      />

      <MobileActionsMenu 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onSave={handleSave}
        onOpen={() => fileInputRef.current?.click()}
        onClear={handleClear}
        onScreenshot={handleScreenshot}
      />

      {isShortcutsOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setIsShortcutsOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md m-4 space-y-4 border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Keyboard Shortcuts</h2>
              <button onClick={() => setIsShortcutsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-sm text-slate-700 mb-3"><strong>Walk / POV mode</strong><p>WASD or arrow keys — move forward, backward and sideways.</p><p>Q / E — turn left / right without a mouse.</p><p>Click the scene — mouse look. Esc — release mouse.</p><p>Mobile: joystick to walk; drag the view to look. Choose Slow, Normal or Fast walking speed.</p></div>
            <div className="grid grid-cols-2 gap-y-3 text-sm text-slate-600">
              <div className="font-medium text-slate-800">Select Mode</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">V</kbd>
              </div>
              <div className="font-medium text-slate-800">Draw Wall</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">W</kbd>
              </div>
              <div className="font-medium text-slate-800">Draw Floor</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">F</kbd>
              </div>
              <div className="font-medium text-slate-800">Ruler / Measure</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">M</kbd>
              </div>
              <div className="font-medium text-slate-800">Add Comment</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">C</kbd>
              </div>
              <div className="col-span-2 border-t border-slate-100 my-1"></div>
              <div className="font-medium text-slate-800">Copy / Paste / Duplicate</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm mr-1">Cmd/Ctrl</kbd>
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm mr-1">C/V/D</kbd>
              </div>
              <div className="font-medium text-slate-800">Undo / Redo</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm mr-1">Cmd/Ctrl</kbd>
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm mr-1">Z</kbd> / <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm ml-1">Shift+Z</kbd>
              </div>
              <div className="font-medium text-slate-800">Delete</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">Backspace / Del</kbd>
              </div>
              <div className="font-medium text-slate-800">Rotate Selected</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">R</kbd>
              </div>
              <div className="font-medium text-slate-800">Multi-Select</div>
              <div className="text-right">
                <kbd className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-mono text-xs border border-slate-200 shadow-sm">Shift + Click / Drag</kbd>
              </div>
            </div>
            <div className="pt-2 text-center text-xs text-slate-400">
              Press Escape to clear selection or cancel current tool
            </div>
          </div>
        </div>
      )}

      <ExportScreenshotModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
        view3D={view3D}
        onCapture={handleCaptureScreenshotBlob}
      />
    </div>
  );
}
