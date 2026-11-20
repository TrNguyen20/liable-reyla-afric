import React, { useState, useEffect } from 'react';
import { X, Check, Sparkles, Flame, AlertCircle } from 'lucide-react';
import { HeatTreatmentCycle } from './heat-treatment-cycle';
import {
  HeatStepParam,
  parseHeatCycleShorthand,
  formatHeatCycleShorthand,
} from './heat-cycle-types';
import { toast } from 'sonner';
import { playAudioCue } from '@/lib/audio-cues';

export interface HeatCyclePreset {
  id: string;
  name: string;
  material: string;
  hardness: string;
  shorthand: string;
  desc: string;
}

export const HEAT_CYCLE_PRESETS: HeatCyclePreset[] = [
  {
    id: 'dac-std',
    name: 'DAC / SKD61',
    material: 'SKD61 / DAC',
    hardness: '46-48 HRC',
    shorthand: 'Q: 1020°C / 2H | T1: 540°C / 5H | T2: 593°C / 5H',
    desc: 'Tôi 1020°C, Ram 1 540°C, Ram 2 593°C',
  },
  {
    id: 'dac-tough',
    name: 'DAC Đỉnh dẻo',
    material: 'DAC',
    hardness: '44-46 HRC',
    shorthand: 'Q: 1020°C / 2H | T1: 600°C / 5H | T2: 585°C / 5H',
    desc: 'Ram 1 600°C làm mềm, Ram 2 585°C khử ứng suất',
  },
  {
    id: 'dac-hard',
    name: 'DAC-P Cứng',
    material: 'DAC-P',
    hardness: '48-49 HRC',
    shorthand: 'Q: 1020°C / 2H | T1: 540°C / 5H | T2: 585°C / 5H',
    desc: 'Tôi 1020°C, Ram 1 540°C, Ram 2 585°C giữ độ cứng',
  },
  {
    id: 'dha-world',
    name: 'DHA-WORLD',
    material: 'DHA-WORLD',
    hardness: '48-50 HRC',
    shorthand: 'Q: 1020°C / 2H | T1: 575°C / 5H | T2: 540°C / 5H',
    desc: 'Tôi 1020°C, Ram 1 575°C, Ram 2 540°C tối đa độ cứng',
  },
  {
    id: 'skd61-soft',
    name: 'SKD61 Mềm',
    material: 'SKD61',
    hardness: '39-41 HRC',
    shorthand: 'Q: 1020°C / 2H | T1: 540°C / 5H | T2: 620°C / 5H',
    desc: 'Ram 2 620°C hạ sâu độ cứng, tối đa độ dẻo dai',
  },
];

export interface HeatCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  lotCode: string;
  workshop?: string | undefined;
  material?: string | undefined;
  requiredHardness?: string | undefined;
  value?: string | undefined;
  onSave: (shorthandValue: string) => void;
  canEdit?: boolean;
}

export const HeatCycleModal: React.FC<HeatCycleModalProps> = ({
  isOpen,
  onClose,
  lotCode,
  workshop,
  material,
  requiredHardness,
  value,
  onSave,
  canEdit = true,
}) => {
  const [steps, setSteps] = useState<HeatStepParam[]>(() => {
    return parseHeatCycleShorthand(value);
  });

  // Kiểm tra xem dữ liệu đã được khởi tạo hay chưa
  const hasInitialized = steps.some((s) => s.temp !== undefined && s.time !== undefined);

  useEffect(() => {
    if (isOpen) {
      if (value && value.trim()) {
        setSteps(parseHeatCycleShorthand(value));
      } else {
        // Mặc định KHÔNG nhập trước bất kỳ tham số nào, để trống hoàn toàn
        setSteps([
          { stage: 'Q', temp: undefined, time: undefined },
          { stage: 'T1', temp: undefined, time: undefined },
          { stage: 'T2', temp: undefined, time: undefined },
          { stage: 'T3', temp: undefined, time: undefined },
        ]);
      }
    }
  }, [isOpen, value]);

  // Handle Escape key to close modal and stop propagation to parent modals
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  const handleStepChange = (
    stage: 'Q' | 'T1' | 'T2' | 'T3',
    field: 'temp' | 'time',
    valStr: string
  ) => {
    const numeric = valStr.trim() === '' ? undefined : parseFloat(valStr);
    setSteps((prev) =>
      prev.map((s) => (s.stage === stage ? { ...s, [field]: numeric } : s))
    );
  };

  const handleApplyPreset = (preset: HeatCyclePreset) => {
    setSteps(parseHeatCycleShorthand(preset.shorthand));
    playAudioCue('success');
    toast.success(`Đã nạp công thức: ${preset.name}`);
  };

  const handleSave = () => {
    const formatted = formatHeatCycleShorthand(steps);
    onSave(formatted);
    playAudioCue('success');
    toast.success('Đã lưu biểu đồ chu trình nhiệt luyện');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-[1px] animate-in fade-in-0 duration-150"
      onClick={(e) => {
        e.stopPropagation();
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-w-[960px] w-[98vw] max-h-[92vh] rounded-xl border border-slate-200 bg-white p-5 font-sans shadow-2xl text-slate-900 animate-slide-up flex flex-col overflow-hidden"
        style={{ borderRadius: '12px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Flame size={18} className="text-amber-600" />
              <h3 className="font-bold text-base text-slate-900 tracking-tight">
                GIÃN ĐỒ NHIỆT (CHU TRÌNH NHIỆT LUYỆN)
              </h3>
              {!canEdit && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold font-mono border border-slate-200">
                  CHỈ XEM
                </span>
              )}
              {workshop && (
                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold font-mono">
                  {workshop}
                </span>
              )}
              {material && (
                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold font-mono">
                  {material}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-mono">
              Lô: <strong className="text-slate-900">{lotCode}</strong>
              {requiredHardness && (
                <span className="ml-2 text-slate-600 font-sans">
                  | Yêu cầu độ cứng: <strong className="text-slate-900">{requiredHardness} HRC</strong>
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
          {/* Thông báo nếu chưa khởi tạo */}
          {!hasInitialized && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs animate-in fade-in">
              <AlertCircle size={15} className="text-amber-600 shrink-0" />
              <span>
                <strong>Chưa có thông số chu trình nhiệt luyện</strong> cho lô này.{canEdit ? ' Vui lòng nhập trực tiếp vào 4 ô bên dưới hoặc nhấp một công thức mẫu để nạp nhanh.' : ''}
              </span>
            </div>
          )}

          {/* 1. HERO SECTION: LIVE PREVIEW SVG TỎA SÁNG Ở TRUNG TÂM (Rộng 880px, Cao 135px) */}
          <div className="rounded-xl border-2 border-slate-900 bg-slate-50/70 p-3 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 animate-pulse" />
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                  BIỂU ĐỒ LIVE PREVIEW (ĐỘ CAO CO GIÃN ĐỘNG)
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Tự động co giãn theo nhiệt độ (°C) và thời gian (H)
              </span>
            </div>
            <div className="flex justify-center bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto">
              <HeatTreatmentCycle steps={steps} width="100%" height={135} showFrame={true} />
            </div>
          </div>

          {/* 2. BỐ CỤC TINH GỌN: 4 Ô CÔNG ĐOẠN NHIỆT LUYỆN */}
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-700">
              <span>THÔNG SỐ CÔNG ĐOẠN NHIỆT LUYỆN</span>
              <span className="text-[10px] text-slate-400 font-normal normal-case">
                {canEdit ? 'Mặc định không yêu cầu nhập trước. Nhập số để kích hoạt từng công đoạn.' : 'Chế độ chỉ xem - Bấm Chỉnh sửa từ cửa sổ chi tiết để hiệu chỉnh.'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {steps.map((stg) => {
                const isFilled = stg.temp !== undefined || stg.time !== undefined;
                return (
                  <div
                    key={stg.stage}
                    className={`p-2 rounded-lg border bg-white space-y-1.5 transition ${isFilled ? 'border-slate-800 shadow-2xs' : 'border-slate-200'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[11.5px] font-bold font-mono text-slate-900">
                        [{stg.stage}] {stg.stage === 'Q' ? 'Tôi' : 'Ram'}
                      </span>
                      {stg.stage === 'T3' && (
                        <span className="text-[9px] text-slate-400 italic">Tùy chọn</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <div>
                        <label className="text-[9.5px] font-medium text-slate-500 block truncate">
                          Nhiệt độ (°C)
                        </label>
                        <input
                          type="number"
                          placeholder={stg.stage === 'Q' ? '1020' : '540'}
                          value={stg.temp ?? ''}
                          disabled={!canEdit}
                          onChange={(e) => handleStepChange(stg.stage, 'temp', e.target.value)}
                          className={`w-full h-7 px-2 text-xs font-mono font-bold border rounded focus:outline-none ${!canEdit ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'border-slate-300 focus:border-slate-900 bg-white'}`}
                        />
                      </div>
                      <div>
                        <label className="text-[9.5px] font-medium text-slate-500 block truncate">
                          Thời gian (H)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          placeholder={stg.stage === 'Q' ? '2' : '5'}
                          value={stg.time ?? ''}
                          disabled={!canEdit}
                          onChange={(e) => handleStepChange(stg.stage, 'time', e.target.value)}
                          className={`w-full h-7 px-2 text-xs font-mono font-bold border rounded focus:outline-none ${!canEdit ? 'bg-slate-100 text-slate-600 border-slate-200 cursor-not-allowed' : 'border-slate-300 focus:border-slate-900 bg-white'}`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. THANH NẠP NHANH CÔNG THỨC MẪU (TINH GỌN KHÔNG CHIẾM DIỆN TÍCH) - CHỈ HIỆN KHI ĐƯỢC PHÉP EDIT */}
          {canEdit && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                <Sparkles size={12} className="text-amber-500" />
                <span>NẠP NHANH CÔNG THỨC MẪU (QUICK PRESETS)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                {HEAT_CYCLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2 py-1.5 rounded border border-slate-200 hover:border-slate-800 bg-white hover:bg-slate-50 text-left transition flex flex-col justify-between group cursor-pointer"
                    title={`${preset.name}: ${preset.shorthand}`}
                  >
                    <p className="text-[10.5px] font-bold text-slate-900 truncate group-hover:text-primary">
                      {preset.name}
                    </p>
                    <p className="text-[9.5px] text-slate-500 font-mono truncate mt-0.5">
                      {preset.hardness}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-3 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-500 font-mono truncate max-w-[540px]">
            Chuỗi kỹ thuật: <strong className="text-slate-800">{formatHeatCycleShorthand(steps) || 'Chưa khởi tạo'}</strong>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition cursor-pointer"
            >
              Đóng
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Lưu thay đổi</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
