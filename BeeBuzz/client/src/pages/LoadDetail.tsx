import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import { loadApi, bidApi } from '../services/api';
import { Load, Bid } from '../types';
import { MapContainer, TileLayer, Marker, Polyline } from 'react-leaflet';
import L from 'leaflet';

import PaymentModal from '../components/PaymentModal';
import RejectPodModal from '../components/RejectPodModal';
import { jsPDF } from 'jspdf';
import './LoadDetail.css';

// Map Icons setup
const truckIcon = new L.DivIcon({
  html: '<div style="font-size: 26px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5); transform: translate(-50%, -50%);">🚚</div>',
  className: 'custom-truck-icon',
  iconSize: [30, 30],
  iconAnchor: [15, 15]
});

const defaultMarker = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const statusLabels: Record<string, string> = {
  pending: 'Pending', accepted: 'Accepted', arrived_pickup: 'Arrived Pickup', loaded: 'Loaded', en_route: 'En Route', arrived_delivery: 'Arrived Delivery', delivered_pending_verification: 'Pending Verification', delivered: 'Delivered'
};

const statusMetadata: Record<string, { label: string; icon: string; desc: string }> = {
  pending: { label: 'Bidding Open', icon: '🏷️', desc: 'Shipper is collecting carrier quotes' },
  accepted: { label: 'Driver Assigned', icon: '🤝', desc: 'Escrow payment locked in secure transit' },
  arrived_pickup: { label: 'At Pickup Location', icon: '📍', desc: 'Driver arrived at cargo pickup point' },
  loaded: { label: 'Cargo Loaded', icon: '📦', desc: 'Goods verified and safely loaded in vehicle' },
  en_route: { label: 'In Transit', icon: '🚚', desc: 'Shipment is traveling on optimized route' },
  arrived_delivery: { label: 'At Delivery Location', icon: '🏁', desc: 'Driver reached target destination' },
  delivered_pending_verification: { label: 'POD Uploaded', icon: '📸', desc: 'Awaiting Shipper verification & release' },
  delivered: { label: 'Completed & Settled', icon: '✅', desc: 'Escrow released. Job finalized' }
};

const statusFlow = ['pending', 'accepted', 'arrived_pickup', 'loaded', 'en_route', 'arrived_delivery', 'delivered_pending_verification', 'delivered'];

const LoadDetail: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lastMessage, sendMessage } = useWebSocket();
  const [load, setLoad] = useState<Load | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  
  const [isEditingBid, setIsEditingBid] = useState(false);
  const [editBidAmount, setEditBidAmount] = useState('');
  const [editBidNotes, setEditBidNotes] = useState('');

  const [isEditingLoad, setIsEditingLoad] = useState(false);
  const [editLoadForm, setEditLoadForm] = useState({ price: '', cargoWeight: '' });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [routeInfo, setRouteInfo] = useState<{ coordinates: [number, number][], distance: number, suggestedPrice: number } | null>(null);

  // Simulation & PDF States
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationIndex, setSimulationIndex] = useState(0);

  // Escrow States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedBidId, setSelectedBidId] = useState<string | null>(null);
  const [showRejectPodModal, setShowRejectPodModal] = useState(false);
  const [selectedBidReport, setSelectedBidReport] = useState<Bid | null>(null);

  // POD States
  const [isUploadingPod, setIsUploadingPod] = useState(false);
  const [podPhotos, setPodPhotos] = useState<File[]>([]);
  const [podPhotosPreviews, setPodPhotosPreviews] = useState<string[]>([]);
  const [podNotes, setPodNotes] = useState('');

  const isDriver = user?.role === 'driver';
  const isShipper = user?.role === 'shipper';

  // WebSocket subscription logic
  useEffect(() => {
    if (id) {
      sendMessage({ type: 'subscribe', loadId: id });
      return () => {
        sendMessage({ type: 'unsubscribe', loadId: id });
      };
    }
  }, [id, sendMessage]);

  // GPS Simulation Loop
  useEffect(() => {
    let intervalId: number | undefined;

    if (isSimulating && load && routeInfo && routeInfo.coordinates.length > 0) {
      // Step faster on long routes
      const stepSize = Math.max(1, Math.ceil(routeInfo.coordinates.length / 25));
      
      intervalId = window.setInterval(async () => {
        if (simulationIndex >= routeInfo.coordinates.length) {
          if (intervalId !== undefined) {
            clearInterval(intervalId);
            intervalId = undefined;
          }
          setIsSimulating(false);
          setSimulationIndex(0);
          alert("📍 Simulation Complete! Driver has arrived at the destination.");
          try {
            await loadApi.updateStatus(load.id, 'arrived_delivery');
            loadLoad();
          } catch (e) {
            console.error("Failed to auto-transition status", e);
          }
          return;
        }

        const [lat, lng] = routeInfo.coordinates[simulationIndex];
        try {
          await loadApi.updateLocation(load.id, lat, lng);
          setLocation({ lat, lng });
          setSimulationIndex(prev => prev + stepSize);
        } catch (err) {
          console.error("Simulation coordinate update failed", err);
        }
      }, 1500);
    }

    return () => {
      if (intervalId !== undefined) {
        clearInterval(intervalId);
      }
    };
  }, [isSimulating, simulationIndex, load, routeInfo]);

  // Waybill PDF Generator
  const generatePDFInvoice = () => {
    if (!load) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Colors
      const primaryColor = [74, 144, 226]; // #4A90E2
      const textColor = [51, 51, 51]; // #333333
      const lightBg = [245, 247, 250]; // Light grey
      
      // Document border
      doc.setDrawColor(230, 230, 230);
      doc.rect(5, 5, 200, 287);

      // Header Banner
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(5, 5, 200, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('BEEBUZZ LOGISTICS', 12, 18);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('SECURE B2B ESCROW MARKETPLACE', 12, 24);

      // Invoice Details (Right Aligned in Header)
      doc.setFont('helvetica', 'bold');
      doc.text('WAYBILL & INVOICE', 145, 15);
      doc.setFont('helvetica', 'normal');
      doc.text(`ID: #${load.id.slice(0, 8).toUpperCase()}`, 145, 20);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, 145, 25);

      // Reset text color
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // section 1: Addresses
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('1. SHIPMENT ROUTE & MILESTONES', 12, 42);
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.line(12, 44, 198, 44);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Origin Pickup:', 12, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(load.pickupAddress, 80), 12, 57);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Destination Delivery:', 110, 52);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(doc.splitTextToSize(load.deliveryAddress, 80), 110, 57);

      // Section 2: Cargo & Vehicle specifications
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('2. CARGO & LOGISTICS DETAILS', 12, 85);
      doc.line(12, 87, 198, 87);

      doc.setFillColor(lightBg[0], lightBg[1], lightBg[2]);
      doc.rect(12, 92, 186, 32, 'F');

      doc.setFontSize(10);
      doc.text('Cargo Category:', 16, 98);
      doc.setFont('helvetica', 'normal');
      doc.text(load.cargoType || 'General Freight', 55, 98);

      doc.setFont('helvetica', 'bold');
      doc.text('Gross weight:', 16, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(`${load.cargoWeight.toLocaleString()} kg`, 55, 105);

      doc.setFont('helvetica', 'bold');
      doc.text('Truck Requested:', 16, 112);
      doc.setFont('helvetica', 'normal');
      doc.text(load.truckType || 'Standard', 55, 112);

      doc.setFont('helvetica', 'bold');
      doc.text('Mapped Distance:', 16, 119);
      doc.setFont('helvetica', 'normal');
      doc.text(routeInfo ? `${routeInfo.distance.toFixed(1)} km` : 'N/A', 55, 119);

      // Driver info (Right side of cargo)
      doc.setFont('helvetica', 'bold');
      doc.text('Assigned Carrier:', 110, 98);
      doc.setFont('helvetica', 'normal');
      doc.text(load.driverName || 'Verified BeeBuzz Driver', 145, 98);

      doc.setFont('helvetica', 'bold');
      doc.text('Contact Mobile:', 110, 105);
      doc.setFont('helvetica', 'normal');
      doc.text(load.driverPhone || 'N/A', 145, 105);

      doc.setFont('helvetica', 'bold');
      doc.text('Vehicle Details:', 110, 112);
      doc.setFont('helvetica', 'normal');
      doc.text(load.driverVehicle || 'N/A', 145, 112);

      doc.setFont('helvetica', 'bold');
      doc.text('Plate Number:', 110, 119);
      doc.setFont('helvetica', 'normal');
      doc.text(load.driverVehicleNumber || 'N/A', 145, 119);

      // Section 3: Financial Summary & Escrow settlement
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('3. ESCROW FINANCIAL SETTLEMENT LEDGER', 12, 142);
      doc.line(12, 144, 198, 144);

      doc.setFontSize(10);
      doc.text('TRANSACTION SUMMARY', 12, 152);
      
      // Grid Header
      doc.setFillColor(230, 235, 245);
      doc.rect(12, 156, 186, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('Item Description', 16, 161);
      doc.text('Percentage', 110, 161);
      doc.text('Amount (INR)', 155, 161);

      // Grid Rows
      doc.setFont('helvetica', 'normal');
      doc.text('Total Escrow Funded Bid Price', 16, 171);
      doc.text('100.0%', 110, 171);
      doc.text(`INR ${load.price.toLocaleString()}.00`, 155, 171);

      doc.text('Platform Escrow Facilitation Fee', 16, 179);
      doc.text('5.0%', 110, 179);
      doc.text(`- INR ${(load.price * 0.05).toLocaleString()}.00`, 155, 179);

      // Grid Footer (Net payout)
      doc.setFillColor(235, 247, 240);
      doc.rect(12, 185, 186, 10, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 120, 70); // Green
      doc.text('DRIVER NET PAYOUT AMOUNT', 16, 191);
      doc.text('95.0%', 110, 191);
      doc.text(`INR ${(load.price * 0.95).toLocaleString()}.00`, 155, 191);

      // Reset color
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);

      // Audit and regulatory details
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ESCROW TRANSACTION HASH & SECURITY STAMP', 12, 212);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`TXN REGISTRY ID: txn_${load.id.slice(0, 16)}_escrow`, 12, 217);
      doc.text('STATUS: COMPLETED & FULLY VERIFIED BY BEEBUZZ SECURE ESCROW CLEARING PROTOCOL.', 12, 222);

      // Section 4: Signatures
      doc.setTextColor(textColor[0], textColor[1], textColor[2]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('4. VERIFICATION SIGNATURES', 12, 245);
      doc.line(12, 247, 198, 247);

      doc.setFontSize(9);
      doc.text('Authorized Shipper Signature', 16, 272);
      doc.text(`Name: ${load.shipperName || 'N/A'}`, 16, 277);

      doc.text('Assigned Driver / Carrier Signature', 110, 272);
      doc.text(`Name: ${load.driverName || 'N/A'}`, 110, 277);

      // Helper to dynamically extract image format for jsPDF
      const getImgFormat = (sigStr: string): 'PNG' | 'JPEG' | 'WEBP' => {
        if (sigStr.includes('image/png')) return 'PNG';
        if (sigStr.includes('image/webp')) return 'WEBP';
        return 'JPEG';
      };

      // Render signatures if they exist, otherwise render placeholders
      if (load.shipperSignature && load.shipperSignature.startsWith('data:image/')) {
        try {
          const format = getImgFormat(load.shipperSignature);
          doc.addImage(load.shipperSignature, format, 16, 250, 40, 15);
        } catch (e) {
          console.error("Failed to add shipper signature to PDF:", e);
          doc.text('__________________________________', 16, 267);
          doc.setFontSize(7);
          doc.text('(Signature Render Failed)', 16, 270);
          doc.setFontSize(9);
        }
      } else {
        doc.text('__________________________________', 16, 267);
      }

      if (load.driverSignature && load.driverSignature.startsWith('data:image/')) {
        try {
          const format = getImgFormat(load.driverSignature);
          doc.addImage(load.driverSignature, format, 110, 250, 40, 15);
        } catch (e) {
          console.error("Failed to add driver signature to PDF:", e);
          doc.text('__________________________________', 110, 267);
          doc.setFontSize(7);
          doc.text('(Signature Render Failed)', 110, 270);
          doc.setFontSize(9);
        }
      } else {
        doc.text('__________________________________', 110, 267);
      }

      // Footer brand notice
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('This document is electronically generated and acts as legal proof of transaction completion.', 40, 290);

      // Save PDF
      doc.save(`BeeBuzz_Invoice_${load.id.slice(0, 8).toUpperCase()}.pdf`);
    } catch (err) {
      console.error("PDF Generation error:", err);
      alert("Failed to download PDF invoice. Please try again.");
    }
  };

  useEffect(() => { loadLoad(); }, [id]);
  useEffect(() => {
    if (lastMessage?.type === 'location_update' && lastMessage.loadId === id) setLocation({ lat: lastMessage.lat, lng: lastMessage.lng });
    if (lastMessage?.type === 'load_update' && lastMessage.loadId === id) loadLoad();
  }, [lastMessage, id]);

  useEffect(() => {
    if (load) {
      const fetchRouteAndPricing = async () => {
        try {
          const pLat = load.pickupLat || 17.6868;
          const pLng = load.pickupLng || 83.2185;
          const dLat = load.deliveryLat || 16.5062;
          const dLng = load.deliveryLng || 80.6480;

          const url = `https://router.project-osrm.org/route/v1/driving/${pLng},${pLat};${dLng},${dLat}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          const data = await res.json();
          
          if (data.routes && data.routes.length > 0) {
            const route = data.routes[0];
            const coords = route.geometry.coordinates.map((c: any) => [c[1], c[0]]);
            const distanceKM = route.distance / 1000;
            
            // Dynamic Pricing Model
            let rate = 20; // flat base rate
            const type = load.truckType?.toLowerCase() || '';
            if (type.includes('pickup')) rate = 15;
            else if (type.includes('mini')) rate = 18;
            else if (type.includes('lorry')) rate = 25;
            else if (type.includes('container')) rate = 35;
            else if (type.includes('flatbed')) rate = 40;
            
            let multiplier = 1;
            if (load.cargoWeight > 500) multiplier = 1.1;
            if (load.cargoWeight > 1000) multiplier = 1.25;
            
            const suggestedPrice = Math.round(distanceKM * rate * multiplier);
            setRouteInfo({ coordinates: coords, distance: distanceKM, suggestedPrice });
          }
        } catch (err) {
          console.error("OSRM routing failed", err);
        }
      };
      fetchRouteAndPricing();
    }
  }, [load]);

  useEffect(() => {
    let watchId: number | undefined;

    if (isTracking && load) {
      if (!('geolocation' in navigator)) {
        alert('Geolocation is not supported by your browser');
        setIsTracking(false);
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          try {
            await loadApi.updateLocation(load.id, lat, lng);
            // Optimistically update local map for the driver
            setLocation({ lat, lng });
          } catch (error) {
            console.error("Location update failed", error);
          }
        },
        (error) => {
          console.error("Error tracking position:", error);
          alert("Please enable location services or allow permissions in your browser to track your route.");
          setIsTracking(false);
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      );
    }

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTracking, load]);

  const loadLoad = async () => {
    try {
      const response = await loadApi.getOne(id!);
      setLoad(response.data.data);
      setEditLoadForm({ price: response.data.data.price, cargoWeight: response.data.data.cargoWeight });
      if (response.data.data.locations?.length > 0) setLocation(response.data.data.locations[0]);
    } catch (error) { console.error('Failed to load:', error); }
    finally { setLoading(false); }
  };


  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try { await loadApi.updateStatus(id!, newStatus); loadLoad(); } catch (error) { console.error('Failed:', error); }
    finally { setUpdating(false); }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    
    if (podPhotos.length + files.length > 5) {
      alert("Maximum 5 photos allowed.");
      return;
    }
    
    const validFiles: File[] = [];
    const previews: string[] = [];
    
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`File ${file.name} exceeds 5MB limit.`);
        continue;
      }
      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }
    
    setPodPhotos(prev => [...prev, ...validFiles]);
    setPodPhotosPreviews(prev => [...prev, ...previews]);
  };

  const removePhoto = (index: number) => {
    setPodPhotos(prev => prev.filter((_, i) => i !== index));
    setPodPhotosPreviews(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  const handleUploadPod = async () => {
    if (podPhotos.length === 0) {
      alert("Please upload at least one photo.");
      return;
    }
    setUpdating(true);
    try {
      const base64Photos = await Promise.all(podPhotos.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = error => reject(error);
        });
      }));
      
      await loadApi.uploadPod(id!, { notes: podNotes, photos: base64Photos });
      loadLoad();
      setPodPhotos([]);
      setPodPhotosPreviews([]);
      setPodNotes('');
      setIsUploadingPod(false);
    } catch (error) { console.error('Failed to upload POD:', error); }
    finally { setUpdating(false); }
  };

  const handleRejectPod = async (comment: string) => {
    try {
      await loadApi.rejectPod(id!, comment);
      setShowRejectPodModal(false);
      loadLoad();
    } catch (err) {
      console.error('Failed to reject POD', err);
      throw err;
    }
  };

  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await bidApi.create({ loadId: id, amount: parseFloat(bidAmount), notes: bidNotes });
      loadLoad();
      setBidAmount(''); setBidNotes('');
    } catch (error) { console.error('Failed:', error); }
    finally { setUpdating(false); }
  };

  const handleAcceptBid = (bidId: string) => {
    setSelectedBidId(bidId);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (paymentSource: string) => {
    if (!selectedBidId) return;
    setShowPaymentModal(false);
    setUpdating(true);
    try {
      await bidApi.accept(selectedBidId, { paymentSource });
      loadLoad();
    } catch (error) { console.error('Failed to accept bid:', error); }
    finally { setUpdating(false); }
  };

  const handleVerifyDelivery = async () => {
    setUpdating(true);
    try {
      await loadApi.verifyDelivery(id!);
      loadLoad();
    } catch (error) {
      console.error('Failed to verify delivery:', error);
      alert('Failed to verify delivery. Please try again.');
    }
    finally { setUpdating(false); }
  };

  const handleEditBid = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const myBid = load?.bids?.find((b: any) => b.driverId === user?.id);
      if (myBid) {
        const response = await bidApi.update(myBid.id, { amount: parseFloat(editBidAmount), notes: editBidNotes });
        alert("Server responded: " + JSON.stringify(response.data));
      }
      setIsEditingBid(false);
      loadLoad();
    } catch (error) { console.error('Failed to edit bid:', error); }
    finally { setUpdating(false); }
  };

  const handleEditLoad = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await loadApi.update(load!.id, { price: parseFloat(editLoadForm.price), cargoWeight: parseFloat(editLoadForm.cargoWeight) });
      setIsEditingLoad(false);
      loadLoad();
    } catch (error) { console.error('Failed to edit load:', error); }
    finally { setUpdating(false); }
  };

  const myBid = load?.bids?.find((b: any) => b.driverId === user?.id);

  const getNextStatus = () => {
    if (!load) return null;
    const currentIndex = statusFlow.indexOf(load.currentStatus);
    if (currentIndex < statusFlow.length - 1) return statusFlow[currentIndex + 1];
    return null;
  };

  if (loading) return <div className="loading">Loading...</div>;
  if (!load) return <div className="error">Load not found</div>;

  const nextStatus = getNextStatus();

  return (
    <div className="load-detail animate-fadeIn">
      <div className="page-header">
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
          {load.currentStatus === 'delivered' && (
            <button className="btn btn-success" onClick={generatePDFInvoice} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
              🧾 Download Invoice & Waybill
            </button>
          )}
          <span className={`badge badge-${load.status} badge-large`}>{statusLabels[load.currentStatus] || load.status}</span>
          {isShipper && load.status === 'open' && (
            <>
              <button className="btn btn-secondary" onClick={() => setIsEditingLoad(!isEditingLoad)} disabled={updating}>Edit Load</button>
              <button className="btn btn-danger" onClick={() => loadApi.cancel(id!)} disabled={updating}>Cancel</button>
            </>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="detail-main">
          <div className="card-static">
            <h2>Load #{load.id.slice(0, 8)}</h2>
            <div className="route-detail">
              <div className="route-point origin">
                <div className="point-marker">📍</div>
                <div className="point-content">
                  <span className="point-label">Pickup Location</span>
                  <span className="point-address">{load.pickupAddress}</span>
                </div>
              </div>
              <div className="route-connector"><div className="connector-line"></div><div className="connector-icon">🚚</div><div className="connector-line"></div></div>
              <div className="route-point destination">
                <div className="point-marker">🏁</div>
                <div className="point-content">
                  <span className="point-label">Delivery Location</span>
                  <span className="point-address">{load.deliveryAddress}</span>
                </div>
              </div>
            </div>
            {load && (
              <div className="map-container card-static" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column' }}>
                <div className="map-header">
                  <h4>📡 Optimized Route Map</h4>
                  {location ? <span className="live-indicator"></span> : <span className="text-muted" style={{fontSize:'12px'}}>(Waiting for Driver GPS)</span>}
                </div>
                
                <MapContainer 
                  center={[load.pickupLat || 17.6868, load.pickupLng || 83.2185]} 
                  zoom={7} 
                  style={{ flex: 1, minHeight: '250px', width: '100%', borderRadius: '8px', zIndex: 0 }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  
                  {/* Drawing Route Polyline */}
                  {routeInfo && <Polyline positions={routeInfo.coordinates} color="#4A90E2" weight={5} opacity={0.7} />}
                  
                  {/* Pickup and Delivery endpoints */}
                  <Marker position={[load.pickupLat || 17.6868, load.pickupLng || 83.2185]} icon={defaultMarker} />
                  <Marker position={[load.deliveryLat || 16.5062, load.deliveryLng || 80.6480]} icon={defaultMarker} />
                  
                  {/* Live Tracking Truck Marker */}
                  {location && <Marker position={[location.lat, location.lng]} icon={truckIcon} />}
                </MapContainer>
                
                <div className="map-footer text-muted" style={{ marginTop: '8px', fontSize: '12px' }}>
                  {location ? `Live Route Coordinates: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Route Map Ready. Awaiting Live Tracking Data.'}
                </div>
              </div>
            )}
          </div>

          <div className="card-static">
            <h3>Cargo Details</h3>
            {isEditingLoad ? (
              <form onSubmit={handleEditLoad} className="cargo-info" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Update Weight (kg)</label>
                  <input type="number" className="input" value={editLoadForm.cargoWeight} onChange={e => setEditLoadForm({...editLoadForm, cargoWeight: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label" style={{display:'flex', justifyContent:'space-between'}}>
                    <span>Update Price (₹)</span>
                    {routeInfo && <span style={{color:'#4A90E2', fontSize:'12px'}}>✨ AI Fare: ₹{routeInfo.suggestedPrice.toLocaleString()} ({routeInfo.distance.toFixed(1)} km)</span>}
                  </label>
                  <input type="number" className="input" value={editLoadForm.price} onChange={e => setEditLoadForm({...editLoadForm, price: e.target.value})} required />
                </div>
                <div style={{display:'flex', gap:'10px', marginTop: '10px'}}>
                  <button type="submit" className="btn btn-primary" disabled={updating}>Save Changes</button>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsEditingLoad(false)}>Cancel</button>
                </div>
              </form>
            ) : (
              <div className="cargo-info">
                <div className="cargo-item"><span className="cargo-label">Type</span><span className="cargo-value">{load.cargoType}</span></div>
                <div className="cargo-item"><span className="cargo-label">Weight</span><span className="cargo-value">{load.cargoWeight.toLocaleString()} kg</span></div>
                <div className="cargo-item"><span className="cargo-label">Truck</span><span className="cargo-value">{load.truckType}</span></div>
                <div className="cargo-item"><span className="cargo-label">Price</span><span className="cargo-value price">₹{load.price.toLocaleString()}</span></div>
                <div className="cargo-item"><span className="cargo-label">Pickup</span><span className="cargo-value">{new Date(load.pickupDate).toLocaleString()}</span></div>
                <div className="cargo-item"><span className="cargo-label">Delivery</span><span className="cargo-value">{new Date(load.deliveryDate).toLocaleString()}</span></div>
                
                {routeInfo && (
                  <div className="cargo-item" style={{ gridColumn: '1 / -1', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{display:'flex', flexDirection:'column'}}>
                      <span className="cargo-label" style={{color: '#4A90E2', fontWeight: 600}}>AI Distance Analysis ✨</span>
                      <span className="text-muted" style={{fontSize: '13px'}}>{routeInfo.distance.toFixed(1)} km mapped driving distance</span>
                    </div>
                    <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                      <span className="cargo-label" style={{color: '#4A90E2', fontWeight: 600}}>Recommended Amount ✨</span>
                      <span className="cargo-value price" style={{color: '#4A90E2'}}>₹{routeInfo.suggestedPrice.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {isDriver && load.status === 'open' && (
            <>
              {!myBid ? (
                <div className="card-static">
                  <h3>Place Your Bid</h3>
                  <form onSubmit={handlePlaceBid} className="bid-form">
                    {routeInfo && (
                      <div className="suggested-bid-banner" style={{background: 'rgba(74, 144, 226, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #4A90E2'}}>
                        <span style={{fontSize:'14px', color:'#4A90E2'}}>💡 <strong>Market Insight:</strong> Based on the mapped driving distance of <strong>{routeInfo.distance.toFixed(1)} km</strong> and a <strong>{load.truckType}</strong> hauling <strong>{load.cargoWeight}kg</strong>, the algorithmic recommended bid for this load is <strong>₹{routeInfo.suggestedPrice.toLocaleString()}</strong>.</span>
                      </div>
                    )}
                    <div className="form-row">
                      <div className="form-group"><label className="form-label">Bid Amount (₹)</label><input type="number" className="input" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)} placeholder={`e.g. ${routeInfo?.suggestedPrice || 1000}`} required /></div>
                    </div>
                    <div className="form-group"><label className="form-label">Notes (Optional)</label><textarea className="input textarea" value={bidNotes} onChange={(e) => setBidNotes(e.target.value)} placeholder="Any notes..." rows={2} /></div>
                    <button type="submit" className="btn btn-primary" disabled={updating}>{updating ? 'Submitting...' : 'Place Bid'}</button>
                  </form>
                </div>
              ) : (
                <div className="card-static">
                  <h3>Your Active Bid</h3>
                  {isEditingBid ? (
                    <form onSubmit={handleEditBid} className="bid-form">
                      {routeInfo && (
                        <div className="suggested-bid-banner" style={{background: 'rgba(74, 144, 226, 0.1)', padding: '12px', borderRadius: '8px', marginBottom: '16px', border: '1px solid #4A90E2'}}>
                          <span style={{fontSize:'14px', color:'#4A90E2'}}>✨ AI Recommends: ₹{routeInfo.suggestedPrice.toLocaleString()}</span>
                        </div>
                      )}
                      <div className="form-group"><label className="form-label">Edit Amount (₹)</label><input type="number" className="input" value={editBidAmount} onChange={(e) => setEditBidAmount(e.target.value)} required /></div>
                      <div className="form-group"><label className="form-label">Edit Notes</label><textarea className="input textarea" value={editBidNotes} onChange={(e) => setEditBidNotes(e.target.value)} rows={2} /></div>
                      <div style={{display:'flex', gap:'10px'}}>
                        <button type="submit" className="btn btn-primary" disabled={updating}>Update Bid</button>
                        <button type="button" className="btn btn-ghost" onClick={() => setIsEditingBid(false)}>Cancel</button>
                      </div>
                    </form>
                  ) : (
                    <div className="bid-item" style={{border: '1px solid var(--border)', padding: '16px', borderRadius: '8px'}}>
                      <div className="bid-info">
                        <span className="bid-amount" style={{fontSize: '24px'}}>₹{myBid.amount.toLocaleString()}</span>
                        <span className={`badge badge-${myBid.status}`}>{myBid.status}</span>
                      </div>
                      {myBid.notes && <p className="text-muted" style={{marginTop: '10px'}}>{myBid.notes}</p>}
                      {myBid.status === 'pending' && (
                        <button className="btn btn-secondary" style={{marginTop: '16px'}} onClick={() => {
                          setEditBidAmount(myBid.amount.toString());
                          setEditBidNotes(myBid.notes || '');
                          setIsEditingBid(true);
                        }}>Edit Amount</button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {isShipper && load.bids && load.bids.length > 0 && (
            <div className="card-static">
              <h3>Bids ({load.bids.length})</h3>
              <div className="bids-list">
                {load.bids.map((bid: Bid) => (
                  <div key={bid.id} className="bid-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div className="bid-info" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="bid-driver" style={{ fontWeight: 'bold' }}>{bid.driverName}</span>
                        <span style={{
                          fontSize: '10px',
                          background: bid.driverIsVerified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          color: bid.driverIsVerified ? '#10b981' : '#f59e0b',
                          border: `1px solid ${bid.driverIsVerified ? '#10b981' : '#f59e0b'}`,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 'bold'
                        }}>
                          {bid.driverIsVerified ? '✓ Verified' : '⚠ Unverified'}
                        </span>
                        <button 
                          type="button" 
                          style={{
                            padding: '2px 8px',
                            fontSize: '10px',
                            background: 'rgba(255,255,255,0.05)',
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            color: 'var(--text-primary)',
                            cursor: 'pointer'
                          }}
                          onClick={() => setSelectedBidReport(bid)}
                        >
                          🔍 Report
                        </button>
                      </div>
                      <span className="bid-rating" style={{ fontSize: '12px' }}>⭐ {bid.driverRating.toFixed(1)} • {bid.driverTotalJobs} jobs</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="bid-amount" style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{bid.amount.toLocaleString()}</div>
                      {bid.status === 'pending' && <button className="btn btn-success btn-sm" onClick={() => handleAcceptBid(bid.id)} disabled={updating}>Accept</button>}
                      <span className={`badge badge-${bid.status}`}>{bid.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="detail-sidebar">
          <div className="card-static">
            <div className="status-timeline">
              {statusFlow.map((status, index) => {
                const isActive = load.currentStatus === status;
                const isPast = statusFlow.indexOf(load.currentStatus) > index;
                const meta = statusMetadata[status] || { label: status, icon: '⚡', desc: '' };
                
                return (
                  <div key={status} className={`timeline-item ${isActive ? 'active' : ''} ${isPast ? 'completed' : ''}`}>
                    <div className="timeline-dot" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 'bold' }}>
                      {isPast ? '✓' : ''}
                    </div>
                    <div className="timeline-content" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <span className="timeline-label" style={{ 
                        fontWeight: isActive || isPast ? 600 : 400, 
                        color: isActive ? '#4A90E2' : (isPast ? 'var(--text-primary)' : 'var(--text-secondary)'), 
                        fontSize: '13px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px' 
                      }}>
                        <span style={{ fontSize: '14px' }}>{meta.icon}</span> <span>{meta.label}</span>
                      </span>
                      {meta.desc && (
                        <p style={{ margin: '0 0 0 20px', fontSize: '11px', color: 'var(--text-secondary)', lineHeight: '1.3' }}>
                          {meta.desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {['accepted', 'arrived_pickup', 'loaded', 'en_route'].includes(load.currentStatus) && routeInfo && routeInfo.coordinates.length > 0 && (
              <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn"
                  onClick={() => setIsSimulating(!isSimulating)}
                  disabled={updating}
                  style={{
                    width: '100%',
                    background: isSimulating ? 'var(--danger)' : 'linear-gradient(135deg, #4A90E2, #0072FF)',
                    color: 'white',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 15px rgba(74, 144, 226, 0.3)',
                    cursor: 'pointer',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  {isSimulating ? (
                    <>🛑 Stop GPS Simulation</>
                  ) : (
                    <>🚀 Simulate Driver GPS Transit ({routeInfo.distance.toFixed(1)} km)</>
                  )}
                </button>
                {isSimulating && (
                  <div style={{ marginTop: '8px', fontSize: '11px', textAlign: 'center', color: '#4A90E2', fontWeight: 500, animation: 'pulse 1.5s infinite' }}>
                    🚚 Vehicle moving: {Math.min(100, Math.round((simulationIndex / routeInfo.coordinates.length) * 100))}% completed
                  </div>
                )}
              </div>
            )}
            
            {isDriver && load.driverId === user?.id && nextStatus && nextStatus !== 'delivered' && (
              nextStatus === 'delivered_pending_verification' ? (
                <div className="card-static" style={{ marginTop: '20px' }}>
                  <h3>📸 Upload Proof of Delivery</h3>
                  {(load as any).podRejectionComment && (
                    <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
                      <strong>Shipper Rejected Previous POD:</strong> {(load as any).podRejectionComment}
                    </div>
                  )}
                  {!isUploadingPod ? (
                    <button className="btn btn-primary" onClick={() => setIsUploadingPod(true)} disabled={updating} style={{ width: '100%' }}>
                      Start POD Upload
                    </button>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                       <div className="form-group" style={{ marginBottom: 0 }}>
                         <label className="form-label">Delivery Notes</label>
                         <textarea className="input textarea" value={podNotes} onChange={e => setPodNotes(e.target.value)} placeholder="Condition, recipient name, etc." rows={2} />
                       </div>
                       <div>
                         <label className="form-label">Photos (Max 5, 5MB each)</label>
                         <input type="file" accept="image/*" capture="environment" multiple onChange={handlePhotoSelect} style={{ marginBottom: '10px', width: '100%', color: 'var(--text-primary)' }} />
                         {podPhotosPreviews.length > 0 && (
                           <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '10px' }}>
                             {podPhotosPreviews.map((preview, idx) => (
                               <div key={idx} style={{ position: 'relative' }}>
                                 <img src={preview} alt="Preview" style={{ width: '80px', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                                 <button onClick={() => removePhoto(idx)} style={{ position: 'absolute', top: '-5px', right: '-5px', background: 'var(--danger)', color: 'white', borderRadius: '50%', width: '20px', height: '20px', border: 'none', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                       <div style={{ display: 'flex', gap: '10px' }}>
                         <button className="btn btn-primary" onClick={handleUploadPod} disabled={updating || podPhotos.length === 0} style={{ flex: 1 }}>Submit POD</button>
                         <button className="btn btn-ghost" onClick={() => setIsUploadingPod(false)} style={{ flex: 1 }}>Cancel</button>
                       </div>
                    </div>
                  )}
                </div>
              ) : (
                <button className="btn btn-primary" onClick={() => handleStatusUpdate(nextStatus)} disabled={updating} style={{ width: '100%', marginTop: '20px' }}>
                  Mark as {statusLabels[nextStatus]}
                </button>
              )
            )}

            {isDriver && load.currentStatus === 'delivered_pending_verification' && (
              <div style={{ padding: '15px', background: 'var(--bg-secondary)', borderRadius: '8px', marginTop: '20px', textAlign: 'center', border: '1px solid var(--border)' }}>
                <p style={{ color: 'var(--text-secondary)', margin: 0 }}>⏳ Waiting for shipper to verify proof of delivery.</p>
              </div>
            )}

            {isDriver && load.driverId === user?.id && ['accepted', 'arrived_pickup', 'loaded', 'en_route'].includes(load.currentStatus) && (
              <button
                className={`btn ${isTracking ? 'btn-danger' : 'btn-success'}`}
                onClick={() => setIsTracking(!isTracking)}
                style={{ width: '100%', marginTop: '10px' }}
              >
                {isTracking ? '🛑 Stop Sharing Location' : '📍 Share Real Live Location'}
              </button>
            )}

            {isShipper && load.proofOfDelivery && (
              <div className="card-static" style={{ marginTop: '20px' }}>
                <h3>Proof of Delivery</h3>
                {load.proofOfDelivery.deliveryNotes && <p><strong>Notes:</strong> {load.proofOfDelivery.deliveryNotes}</p>}
                {load.proofOfDelivery.recipientName && <p><strong>Recipient:</strong> {load.proofOfDelivery.recipientName}</p>}
                {load.proofOfDelivery.photos && load.proofOfDelivery.photos.length > 0 && (
                  <div style={{ display: 'flex', gap: '10px', marginTop: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                    {load.proofOfDelivery.photos.map((photo: string, idx: number) => (
                      <img key={idx} src={photo} alt={`POD ${idx}`} style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--border)' }} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {isShipper && load.currentStatus === 'delivered_pending_verification' && (
              <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', borderRadius: '8px' }}>
                <h4 style={{ color: 'var(--success)', marginBottom: '10px' }}>Delivery Verification Required</h4>
                <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>The driver has uploaded proof of delivery. Please verify and release payment, or reject if the proof is insufficient.</p>
                <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
                  <button 
                    className="btn btn-success" 
                    onClick={handleVerifyDelivery} 
                    disabled={updating} 
                    style={{ width: '100%' }}
                  >
                    {updating ? 'Processing...' : '✅ Verify & Release Payment'}
                  </button>
                  <button 
                    className="btn btn-danger" 
                    onClick={() => setShowRejectPodModal(true)} 
                    disabled={updating} 
                    style={{ width: '100%' }}
                  >
                    Don't Verify (Request Re-upload)
                  </button>
                </div>
              </div>
            )}

            {isShipper && load.driverId && load.currentStatus !== 'delivered' && (
              <div style={{ marginTop: '20px', padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg-secondary)' }}>
                <label style={{display: 'block', marginBottom: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600}}>FORCE UPDATE STATUS</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select 
                    className="select" 
                    value={load.currentStatus}
                    onChange={(e) => handleStatusUpdate(e.target.value)}
                    disabled={updating}
                  >
                    {statusFlow.map(status => (
                      <option key={status} value={status} style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>{statusLabels[status]}</option>
                    ))}
                  </select>
                </div>
                <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '8px'}}>Changes here will automatically sync to the driver's device.</p>
              </div>
            )}
          </div>

          <div className="card-static">
            <h3>{isDriver ? 'Shipper Info' : (load.driverId ? 'Driver Info' : 'No Driver Assigned')}</h3>
            {isDriver ? (<div className="contact-info"><p><strong>{load.shipperName}</strong></p><p>📞 {load.shipperPhone}</p></div>) : load.driverId ? (<div className="contact-info"><p><strong>{load.driverName}</strong></p><p>📞 {load.driverPhone}</p><p>🚛 {load.driverVehicle}</p></div>) : <p className="text-muted">Waiting for driver...</p>}
          </div>
        </div>
      </div>

      {showPaymentModal && load && (
        <PaymentModal 
          amount={load.price} 
          onSuccess={handlePaymentSuccess} 
          onCancel={() => setShowPaymentModal(false)} 
        />
      )}


      {showRejectPodModal && (
        <RejectPodModal 
          onReject={handleRejectPod} 
          onCancel={() => setShowRejectPodModal(false)} 
        />
      )}

      {selectedBidReport && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="card-static animate-fadeIn" style={{
            maxWidth: '550px',
            width: '100%',
            background: 'rgba(18, 18, 20, 0.95)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            position: 'relative'
          }}>
            <button 
              type="button" 
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                fontSize: '18px',
                cursor: 'pointer'
              }}
              onClick={() => setSelectedBidReport(null)}
            >
              ✕
            </button>

            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <span style={{ fontSize: '32px' }}>🏛</span>
              <h3 style={{ marginTop: '8px', marginBottom: '4px' }}>MoRTH Parivahan Verification Report</h3>
              <p style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold', margin: 0 }}>
                OFFICIAL TRANSPORT DATABASE INTEGRITY CHECK • BEEBUZZ ESCROW PROTOCOL
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Carrier/Driver Name:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedBidReport.driverName}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Driving License (DL):</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedBidReport.driverLicenseNumber || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Vehicle Plate Number:</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{selectedBidReport.driverVehicleNumber || 'N/A'}</span>
                </div>
              </div>

              {!selectedBidReport.driverLicenseNumber ? (
                <div style={{ border: '1px solid rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.02)', borderRadius: '8px', padding: '16px', textAlign: 'center', fontSize: '13px' }}>
                  <span style={{ fontSize: '24px' }}>⚠</span>
                  <h4 style={{ margin: '8px 0 4px', color: '#f59e0b' }}>Carrier is Unverified</h4>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)' }}>
                    This driver has not run their Parivahan database verification background check yet.
                  </p>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1, border: '1px solid rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.02)', borderRadius: '6px', padding: '10px', fontSize: '11px' }}>
                      <div style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '4px' }}>SARATHI DL MATCH</div>
                      <div>Status: <strong>VALID</strong></div>
                      <div>Expiry: 14-Mar-2028</div>
                      <div>Class: HGV, LMV</div>
                    </div>
                    <div style={{ flex: 1, border: '1px solid rgba(74, 144, 226, 0.3)', background: 'rgba(74, 144, 226, 0.02)', borderRadius: '6px', padding: '10px', fontSize: '11px' }}>
                      <div style={{ fontWeight: 'bold', color: '#4A90E2', marginBottom: '4px' }}>VAHAN RC MATCH</div>
                      <div>Status: <strong>ACTIVE</strong></div>
                      <div>Fitness: 18-Feb-2027</div>
                      <div>Insurance: ACTIVE</div>
                    </div>
                  </div>

                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '8px' }}>
                      Challans Database Records:
                    </div>
                    {(() => {
                      const r = selectedBidReport.driverVerificationReport ? JSON.parse(selectedBidReport.driverVerificationReport) : null;
                      if (!r || !r.challans || r.challans.length === 0) {
                        return <div style={{ fontSize: '11px', color: '#10b981', fontWeight: 'bold' }}>✓ Clean driving record! No active infractions detected.</div>;
                      }
                      const unpaid = r.challans.filter((c: any) => c.status === 'unpaid') || [];
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '11px', color: unpaid.length === 0 ? '#10b981' : '#f59e0b', fontWeight: 'bold', marginBottom: '4px' }}>
                            {unpaid.length === 0 ? '✓ All traffic challans paid & settled.' : `⚠ ${unpaid.length} active unpaid challans found.`}
                          </div>
                          {r.challans.map((c: any) => (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', fontSize: '11px' }}>
                              <div>
                                <div style={{ fontWeight: 'bold' }}>{c.violation}</div>
                                <div style={{ color: 'var(--text-secondary)' }}>ID: {c.id} • Fine: ₹{c.amount}</div>
                              </div>
                              <span style={{ 
                                fontWeight: 'bold', 
                                color: c.status === 'paid' ? '#10b981' : '#ef4444' 
                              }}>
                                {c.status === 'paid' ? 'Paid ✓' : 'UNPAID ⚠'}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}

              <button 
                type="button" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '8px' }}
                onClick={() => setSelectedBidReport(null)}
              >
                Close Verification Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoadDetail;
