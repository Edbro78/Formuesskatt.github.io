// Remove all imports and use global variables
const { useState, useMemo, useCallback, useEffect } = React;
const { createRoot } = ReactDOM;

// Chart.js is already loaded globally
const {
  Chart: ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend: ChartJsLegend,
  PointElement,
  LineElement,
  Filler,
} = Chart;

// Custom Chart components using Chart.js directly
const Bar = ({ data, options }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            // Destroy existing chart
            if (chartRef.current) {
                chartRef.current.destroy();
            }

            // Create new chart
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'bar',
                data: data,
                options: options
            });
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, options]);

    return React.createElement('canvas', { ref: canvasRef });
};

const Line = ({ data, options }) => {
    const canvasRef = React.useRef(null);
    const chartRef = React.useRef(null);

    React.useEffect(() => {
        if (canvasRef.current && typeof Chart !== 'undefined') {
            // Destroy existing chart
            if (chartRef.current) {
                chartRef.current.destroy();
            }

            // Create new chart
            const ctx = canvasRef.current.getContext('2d');
            chartRef.current = new Chart(ctx, {
                type: 'line',
                data: data,
                options: options
            });
        }

        return () => {
            if (chartRef.current) {
                chartRef.current.destroy();
            }
        };
    }, [data, options]);

    return React.createElement('canvas', { ref: canvasRef });
};

// --- From constants.ts ---
const START_YEAR = new Date().getFullYear();

const CHART_COLORS = {
    hovedstol: '#4A6D8C', // Mørk, dempet blå/grå
    avkastning: '#88CCEE', // Lysere blå
    sparing: '#3388CC', // Hovedblå
    utbetaling_netto: '#005599', // Mørkere blå for uttak
    utbetaling_skatt: '#FFD700', // Yellow for tax on events
    event_total_color: '#CC0000', // Rød
    renteskatt: '#FFD700', // Yellow for tax on events
    skatt2: '#FFD700', // Yellow for tax on events
    aksjeandel: '#66CCDD', // Teal
    renteandel: '#A9BCCD', // Lys grå-blå
    innskutt_kapital: '#3388CC' // Hovedblå
};

const LEGEND_DATA = [
    { label: 'Hovedstol', color: CHART_COLORS.hovedstol },
    { label: 'Avkastning', color: CHART_COLORS.avkastning },
    { label: 'Årlig sparing', color: CHART_COLORS.sparing },
    { label: 'Hendelser', color: CHART_COLORS.event_total_color },
    { label: 'Netto utbetaling', color: CHART_COLORS.utbetaling_netto },
    { label: 'Skatt på årlige utbetalinger', color: CHART_COLORS.utbetaling_skatt },
    { label: 'Skatt på hendelser', color: CHART_COLORS.skatt2 },
    { label: 'Løpende renteskatt', color: CHART_COLORS.renteskatt }
];

const INITIAL_APP_STATE = {
    initialPortfolioSize: 5000000,
    investedCapital: 2500000,
    investmentYears: 10,
    payoutYears: 10,
    desiredAnnualPayoutAfterTax: 1000000,
    initialStockAllocation: 65,
    stockReturnRate: 8.0,
    bondReturnRate: 5.0,
    shieldingRate: 3.9,
    taxRate: 37.84,
    annualSavings: 0,
    events: [],
    taperingOption: 'none',
    deferredBondTax: false, // Ny state for utsatt skatt på renter
    investorType: 'Privat', // Ny state for AS eller Privat
    manualBondTaxRate: 22.0, // Ny state for manuell kapitalskatt
    manualStockTaxRate: 37.8, // Ny state for manuell aksjebeskatning
    desiredAnnualConsumptionPayout: 800000, // Ny state for ønsket årlig uttak til forbruk
    desiredAnnualWealthTaxPayout: 200000, // Ny state for ønsket årlig uttak til formuesskatt
};

const STOCK_ALLOCATION_OPTIONS = [
    { label: '100% Renter', value: 0 },
    { label: '20% Aksjer', value: 20 },
    { label: '45% Aksjer', value: 45 },
    { label: '55% Aksjer', value: 55 },
    { label: '65% Aksjer', value: 65 },
    { label: '85% Aksjer', value: 85 },
    { label: '100% Aksjer', value: 100 }
];

const TAPERING_OPTIONS = [
    { id: 'tapering-none', value: 'none', label: 'Ingen', sublabel: '' },
    { id: 'tapering-5', value: '5%', label: '5% ', sublabel: '' },
    { id: 'tapering-10', value: '10%', label: '10% ', sublabel: '' },
    { id: 'tapering-15', value: '15%', label: '15% ', sublabel: '' }
];

// --- From services/prognosisCalculator.ts ---
const populateAnnualStockPercentages = (state) => {
    const totalSimulatedYears = state.investmentYears + state.payoutYears;
    const annualStockPercentages = [];

    for (let index = 0; index < totalSimulatedYears; index++) {
        const isInvestmentYear = index < state.investmentYears;
        const isPayoutYear = index >= state.investmentYears;
        let currentPercentage = 0;

        if (isInvestmentYear) {
            currentPercentage = state.initialStockAllocation;
        } else if (isPayoutYear) {
            if (state.taperingOption !== 'none') {
                const taperRate = parseFloat(state.taperingOption.replace('%', '')) / 100;
                const payoutYearIndex = index - state.investmentYears;

                const basePercentageForTapering = state.investmentYears > 0 ? annualStockPercentages[state.investmentYears - 1] : state.initialStockAllocation;
                const reductionAmount = payoutYearIndex * (taperRate * 100);
                currentPercentage = Math.max(0, basePercentageForTapering - reductionAmount);
            } else {
                currentPercentage = state.initialStockAllocation;
            }
        }
        annualStockPercentages.push(currentPercentage);
    }
    return annualStockPercentages;
};

const calculatePrognosis = (state) => {
    const labels = [];
    const data = {
        hovedstol: [], avkastning: [], sparing: [], nettoUtbetaling: [],
        skatt: [], renteskatt: [], event_total: [], skatt2: [],
        annualStockPercentages: [], annualBondPercentages: [], investedCapitalHistory: []
    };

    let currentPortfolioValue = state.initialPortfolioSize;
    let taxFreeCapitalRemaining = state.investedCapital;
    let deferredEventTax = 0; // Tax from an event to be paid NEXT year.
    let deferredBondTax = 0; // Bond tax to be paid NEXT year (when not using deferred mode)
    let accumulatedBondTax = 0; // Accumulated bond tax when deferred mode is enabled

    const stockReturnRate = state.stockReturnRate / 100;
    const bondReturnRate = state.bondReturnRate / 100;
    const shieldingRate = state.shieldingRate / 100;
    const taxRate = state.manualStockTaxRate / 100; // Bruker manuell aksjebeskatning
    const bondTaxRate = state.manualBondTaxRate / 100; // Bruker manuell kapitalskatt

    const annualStockPercentages = populateAnnualStockPercentages(state);
    const totalSimulatedYears = state.investmentYears + state.payoutYears;

    for (let i = 0; i < totalSimulatedYears; i++) {
        const year = START_YEAR + i;
        labels.push(year.toString());

        const startOfYearPortfolioValue = currentPortfolioValue;
        
        // --- START OF YEAR ---

        // 1. Pay deferred tax from LAST year's event and bond tax
        const taxToPayThisYear = deferredEventTax + deferredBondTax;
        currentPortfolioValue -= taxToPayThisYear;
        deferredEventTax = 0; // Reset for the current year's calculation.
        deferredBondTax = 0; // Reset for the current year's calculation.

        // 2. Grow tax-free capital with shielding rate
        taxFreeCapitalRemaining *= (1 + shieldingRate);

        // 3. Handle inflows (savings and positive events)
        const isInvestmentYear = i < state.investmentYears;
        let totalInflow = isInvestmentYear ? state.annualSavings : 0;
        let eventWithdrawal = 0;
        let netEventAmountForChart = 0;

        state.events.forEach(event => {
            if (year >= event.startAar && year <= event.sluttAar) {
                netEventAmountForChart += event.belop;
                if (event.belop > 0) {
                    totalInflow += event.belop;
                } else {
                    eventWithdrawal += event.belop; // Negative value
                }
            }
        });
        currentPortfolioValue += totalInflow;
        taxFreeCapitalRemaining += totalInflow;

        // 4. Calculate investment growth and running bond tax
        const annualStockPercentage = annualStockPercentages[i];
        const annualBondPercentage = 100 - annualStockPercentage;
        let totalGrossReturn = 0;
        let annualBondTaxAmount = 0;

        if (currentPortfolioValue > 0) {
            const stockValue = currentPortfolioValue * (annualStockPercentage / 100);
            const bondValue = currentPortfolioValue * (annualBondPercentage / 100);
            const grossStockReturn = stockValue * stockReturnRate;
            const grossBondReturn = bondValue * bondReturnRate;
            totalGrossReturn = grossStockReturn + grossBondReturn;
            
            // Handle bond tax based on deferred setting
            if (state.deferredBondTax) {
                // Accumulate bond tax instead of paying it immediately
                accumulatedBondTax += grossBondReturn * bondTaxRate;
                annualBondTaxAmount = 0; // No immediate bond tax
            } else {
                // Defer bond tax to next year (new behavior)
                deferredBondTax += grossBondReturn * bondTaxRate;
                annualBondTaxAmount = 0; // No immediate bond tax
            }
            
            currentPortfolioValue += totalGrossReturn - annualBondTaxAmount;
        }

        // 5. Handle outflows and calculate taxes
        let annualWithdrawalTaxAmount = 0;
        let annualNetWithdrawalAmountForChart = 0;
        
        // 5a. Regular annual payouts (taxed in the same year)
        const isOrdinaryPayoutYear = (i >= state.investmentYears);
        const totalDesiredPayout = state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout;
        if (isOrdinaryPayoutYear && totalDesiredPayout > 0) {
            let desiredNet = totalDesiredPayout;
            let fromTaxFree = Math.min(desiredNet, taxFreeCapitalRemaining);
            taxFreeCapitalRemaining -= fromTaxFree;
            
            const remainingDesiredNet = desiredNet - fromTaxFree;
            let grossWithdrawal = fromTaxFree;

            if (remainingDesiredNet > 0) {
                let grossNeededFromTaxable;
                
                if (state.investorType === 'AS') {
                    // AS: All withdrawals taxed as dividends (37.8%) regardless of allocation
                    const totalTax = remainingDesiredNet * taxRate;
                    grossNeededFromTaxable = remainingDesiredNet + totalTax;
                    annualWithdrawalTaxAmount += totalTax;
                } else if (state.deferredBondTax) {
                    // Privat with deferred bond tax: Calculate tax based on current allocation
                    const stockPortion = remainingDesiredNet * (annualStockPercentage / 100);
                    const bondPortion = remainingDesiredNet * (annualBondPercentage / 100);
                    
                    const stockTax = stockPortion * taxRate;
                    const bondTax = bondPortion * bondTaxRate;
                    const totalTax = stockTax + bondTax;
                    
                    grossNeededFromTaxable = remainingDesiredNet + totalTax;
                    annualWithdrawalTaxAmount += totalTax;
                } else {
                    // Privat without deferred bond tax: only tax the stock portion since bond tax is already paid
                    const stockPortion = remainingDesiredNet * (annualStockPercentage / 100);
                    const bondPortion = remainingDesiredNet * (annualBondPercentage / 100);
                    
                    // Only tax the stock portion, bond portion is already taxed
                    const stockTax = stockPortion * taxRate;
                    const totalTax = stockTax; // No additional bond tax since it's already paid
                    
                    grossNeededFromTaxable = remainingDesiredNet + totalTax;
                    annualWithdrawalTaxAmount += totalTax;
                }
                
                grossWithdrawal += grossNeededFromTaxable;
            }
            currentPortfolioValue -= grossWithdrawal;
            annualNetWithdrawalAmountForChart += desiredNet;
        }

        // 5b. Event withdrawals (tax is DEFERRED to next year)
        if (eventWithdrawal < 0) {
            const withdrawalAmount = Math.abs(eventWithdrawal);
            
            currentPortfolioValue -= withdrawalAmount; // Reduce portfolio by the withdrawal amount now

            let fromTaxFree = Math.min(withdrawalAmount, taxFreeCapitalRemaining);
            taxFreeCapitalRemaining -= fromTaxFree;

            const taxableWithdrawal = withdrawalAmount - fromTaxFree;
            
            if (taxableWithdrawal > 0) {
                // Calculate tax, but store it in the deferred variable to be paid NEXT year.
                if (state.investorType === 'AS') {
                    // AS: All withdrawals taxed as dividends (37.8%) regardless of allocation
                    deferredEventTax = taxableWithdrawal * taxRate;
                } else if (state.deferredBondTax) {
                    // Privat with deferred bond tax: Calculate tax based on current allocation
                    const stockPortion = taxableWithdrawal * (annualStockPercentage / 100);
                    const bondPortion = taxableWithdrawal * (annualBondPercentage / 100);
                    
                    const stockTax = stockPortion * taxRate;
                    const bondTax = bondPortion * bondTaxRate;
                    deferredEventTax = stockTax + bondTax;
                } else {
                    // Privat without deferred bond tax: only tax the stock portion since bond tax is already paid
                    const stockPortion = taxableWithdrawal * (annualStockPercentage / 100);
                    const bondPortion = taxableWithdrawal * (annualBondPercentage / 100);
                    
                    // Only tax the stock portion, bond portion is already taxed
                    const stockTax = stockPortion * taxRate;
                    deferredEventTax = stockTax; // No additional bond tax since it's already paid
                }
            }
        }
        
        // --- END OF YEAR ---

        // 6. Push data to arrays for charting
        data.hovedstol.push(Math.round(startOfYearPortfolioValue));
        data.avkastning.push(Math.round(totalGrossReturn));
        data.sparing.push(Math.round(isInvestmentYear ? state.annualSavings : 0));
        data.event_total.push(Math.round(netEventAmountForChart));
        data.nettoUtbetaling.push(Math.round(-annualNetWithdrawalAmountForChart));
        data.skatt.push(Math.round(-annualWithdrawalTaxAmount));
        data.skatt2.push(Math.round(-taxToPayThisYear)); // Push the deferred tax that was paid THIS year
        data.renteskatt.push(Math.round(-annualBondTaxAmount));
        data.annualStockPercentages.push(Math.round(annualStockPercentage));
        data.annualBondPercentages.push(Math.round(annualBondPercentage));
        data.investedCapitalHistory.push(Math.round(taxFreeCapitalRemaining));
    }

    return { labels, data };
};

// --- From App.tsx ---
ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title, Tooltip, ChartJsLegend, PointElement, LineElement, Filler
);

const formatCurrency = (value) => new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatNumberRaw = (value) => new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

// --- HELPER & CHILD COMPONENTS --- //
const SliderInput = ({ id, label, value, min, max, step, onChange, unit, isCurrency, displayValue }) => (
    <div>
        <label htmlFor={id} className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">{label}</label>
        <div className="flex items-center gap-4 mt-1">
            <input
                type="range"
                id={id}
                name={id}
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(id, parseFloat(e.target.value))}
                className="w-full h-2 bg-[#DDDDDD] rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-[#66CCDD] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
            />
            <span className="font-medium text-base text-[#333333] w-32 text-right">
                {displayValue ?? (isCurrency ? formatCurrency(value) : `${formatNumberRaw(value)} ${unit}`)}
            </span>
        </div>
    </div>
);

const DeferredBondTaxToggle = ({ value, onChange }) => (
    <div>
        <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Utsatt skatt på renter</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button 
                onClick={() => onChange('deferredBondTax', false)} 
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${!value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>Nei</span>
            </button>
            <button 
                onClick={() => onChange('deferredBondTax', true)} 
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>Ja</span>
            </button>
        </div>
    </div>
);

const InvestorTypeToggle = ({ value, onChange }) => (
    <div>
        <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Investor type</label>
        <div className="grid grid-cols-2 gap-2 mt-2">
            <button 
                onClick={() => onChange('investorType', 'AS')} 
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'AS' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>AS</span>
            </button>
            <button 
                onClick={() => onChange('investorType', 'Privat')} 
                className={`p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${value === 'Privat' ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}
            >
                <span>Privat</span>
            </button>
        </div>
    </div>
);

const ResetAllButton = ({ onReset }) => (
    <div>
        <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Nullstill alt</label>
        <div className="mt-2">
            <button 
                onClick={onReset} 
                className="w-full p-3 rounded-lg flex items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100"
            >
                <span>Nullstill alt</span>
            </button>
        </div>
    </div>
);

const ManualTaxInput = ({ id, label, value, onChange }) => (
    <div>
        <label htmlFor={id} className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">{label}</label>
        <div className="flex items-center gap-2 mt-1">
            <input
                type="number"
                id={id}
                name={id}
                min="0"
                max="100"
                step="0.1"
                value={value}
                onChange={(e) => onChange(id, parseFloat(e.target.value) || 0)}
                className="flex-1 bg-white border border-[#DDDDDD] rounded-md px-3 py-2 text-[#333333] focus:outline-none focus:ring-2 focus:ring-[#66CCDD] focus:border-transparent"
                placeholder="0.0"
            />
            <span className="font-medium text-base text-[#333333] w-8">%</span>
        </div>
    </div>
);

const EventRow = ({ event, onUpdate, onRemove, maxYear }) => {
    const [amount, setAmount] = useState(() => formatNumberRaw(event.belop));

    useEffect(() => {
        setAmount(formatNumberRaw(event.belop));
    }, [event.belop]);

    const handleAmountChange = (e) => {
        setAmount(e.target.value);
    };

    const handleAmountBlur = () => {
        let num = parseFloat(amount.replace(/\s/g, '').replace(/,/g, '.'));
        if (isNaN(num)) num = 0;
        onUpdate(event.id, 'belop', num);
    };

    const handleStartChange = (e) => {
        const newStart = parseInt(e.target.value, 10);
        onUpdate(event.id, 'startAar', newStart);
        if (newStart > event.sluttAar) {
            onUpdate(event.id, 'sluttAar', newStart);
        }
    };

    const handleEndChange = (e) => {
        const newEnd = parseInt(e.target.value, 10);
        onUpdate(event.id, 'sluttAar', newEnd);
        if (newEnd < event.startAar) {
            onUpdate(event.id, 'startAar', newEnd);
        }
    };

    const range = maxYear - START_YEAR;
    const leftPercent = range > 0 ? ((event.startAar - START_YEAR) / range) * 100 : 0;
    const widthPercent = range > 0 ? ((event.sluttAar - event.startAar) / range) * 100 : 0;

    return (
        <div className="grid grid-cols-12 gap-3 items-center bg-gray-50 border border-[#DDDDDD] rounded-lg p-3">
            <div className="col-span-3">
                <input type="text" value={event.type} onChange={(e) => onUpdate(event.id, 'type', e.target.value)} className="w-full bg-white border border-[#DDDDDD] rounded-md px-3 py-1.5 text-[#333333]" placeholder="Navn på hendelse" />
            </div>
            <div className="col-span-5 relative h-10 flex items-center">
                <div className="relative w-full">
                    {/* Track background */}
                    <div className="absolute w-full h-1.5 bg-[#DDDDDD] rounded-full top-1/2 -translate-y-1/2"></div>
                    {/* Highlighted track */}
                    <div className="absolute h-1.5 bg-[#66CCDD] rounded-full top-1/2 -translate-y-1/2" style={{ left: `${leftPercent}%`, width: `${Math.max(0, widthPercent)}%` }}></div>
                    
                                         {/* Start Year Label */}
                     <span className="absolute text-sm text-gray-500 -bottom-8" style={{ left: `${leftPercent}%`, transform: 'translateX(-50%)' }}>{event.startAar}</span>
                     {/* End Year Label */}
                     <span className="absolute text-sm text-gray-500 -bottom-8" style={{ left: `${leftPercent + widthPercent}%`, transform: 'translateX(-50%)' }}>{event.sluttAar}</span>

                    {/* Start slider (bottom layer) */}
                    <input 
                        type="range" min={START_YEAR} max={maxYear} value={event.startAar} onChange={handleStartChange} 
                        className="absolute w-full h-1.5 appearance-none bg-transparent m-0 z-10 top-1/2 -translate-y-1/2 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#66CCDD] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none" 
                    />
                    
                    {/* End slider (top layer, track is non-interactive) */}
                    <input 
                        type="range" min={START_YEAR} max={maxYear} value={event.sluttAar} onChange={handleEndChange} 
                        className="absolute w-full h-1.5 appearance-none bg-transparent m-0 z-20 pointer-events-none top-1/2 -translate-y-1/2 [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-[#66CCDD] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none" 
                    />
                </div>
            </div>
            <div className="col-span-3">
                <input type="text" value={amount} onChange={handleAmountChange} onBlur={handleAmountBlur} className="w-full bg-white border border-[#DDDDDD] rounded-md px-3 py-1.5 text-[#333333] text-right" placeholder="Beløp" />
            </div>
            <div className="col-span-1 flex justify-end">
                <button onClick={() => onRemove(event.id)} className="text-gray-400 hover:text-[#CC0000] transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
            </div>
        </div>
    );
};

const CustomLegend = ({ items }) => (
    <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 mt-4 text-[#333333]/90 text-sm">
        {items.map(item => (
            <div key={item.label} className="flex items-center">
                <div className="w-4 h-4 rounded-sm mr-2" style={{ backgroundColor: item.color }}></div>
                <span>{item.label}</span>
            </div>
        ))}
    </div>
);

// --- MAIN APP COMPONENT --- //
function App() {
    const [state, setState] = useState(INITIAL_APP_STATE);
    const [showAllocationChart, setShowAllocationChart] = useState(false);

    const handleStateChange = useCallback((id, value) => {
        setState(prevState => {
            const newState = { ...prevState, [id]: value };
            if (id === 'initialPortfolioSize' && newState.investedCapital > value) {
                newState.investedCapital = value;
            }
            if (id === 'investedCapital' && value > newState.initialPortfolioSize) {
                newState.investedCapital = newState.initialPortfolioSize;
            }
            return newState;
        });
    }, []);

    const handleResetAll = useCallback(() => {
        setState({
            ...INITIAL_APP_STATE,
            initialPortfolioSize: 0,
            investedCapital: 0,
            desiredAnnualPayoutAfterTax: 0,
            annualSavings: 0,
            initialStockAllocation: 0, // 100% renter
            events: [],
            investorType: 'Privat', // Beholder Privat som standard
            manualBondTaxRate: 22.0, // Beholder standard kapitalskatt
            manualStockTaxRate: 37.8, // Beholder standard aksjebeskatning
            desiredAnnualConsumptionPayout: 0, // Nullstiller forbruksutbetaling
            desiredAnnualWealthTaxPayout: 0, // Nullstiller formuesskatt utbetaling
        });
    }, []);

    const handleTaperingChange = (option) => {
        setState(s => ({ ...s, taperingOption: option }));
        setShowAllocationChart(option !== 'none');
    };

    const handleAddEvent = useCallback(() => {
        const newEvent = {
            id: `event-${Date.now()}`,
            type: 'Uttak',
            belop: 0,
            startAar: START_YEAR, // Default to current year
            sluttAar: START_YEAR, // Default to current year
        };
        setState(s => ({ ...s, events: [...s.events, newEvent] }));
    }, []);

    const handleUpdateEvent = useCallback((id, key, value) => {
        setState(s => ({
            ...s,
            events: s.events.map(e => e.id === id ? { ...e, [key]: value } : e)
        }));
    }, []);

    const handleRemoveEvent = useCallback((id) => {
        setState(s => ({ ...s, events: s.events.filter(e => e.id !== id) }));
    }, []);

    const prognosis = useMemo(() => calculatePrognosis(state), [state]);

    const chartOptions = {
        responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    title: (items) => `År ${items[0].label}`,
                    label: (context) => `${context.dataset.label || ''}: ${formatCurrency(context.raw)}`,
                }
            }
        },
        scales: {
            x: { stacked: true, grid: { display: false }, ticks: { color: '#333333' } },
            y: {
                stacked: true, grid: { color: '#DDDDDD' },
                ticks: { color: '#333333', callback: (value) => `${(value / 1000000).toLocaleString('nb-NO')} MNOK` }
            }
        }
    };
    
    const investmentChartData = {
        labels: prognosis.labels,
        datasets: [
            { label: 'Avkastning', data: prognosis.data.avkastning, backgroundColor: CHART_COLORS.avkastning, stack: 'portfolio' },
            { label: 'Årlig sparing', data: prognosis.data.sparing, backgroundColor: CHART_COLORS.sparing, stack: 'portfolio' },
            { label: 'Hovedstol', data: prognosis.data.hovedstol, backgroundColor: CHART_COLORS.hovedstol, stack: 'portfolio' },
            { label: 'Hendelser', data: prognosis.data.event_total, backgroundColor: CHART_COLORS.event_total_color, stack: 'portfolio' },
            { label: 'Netto utbetaling', data: prognosis.data.nettoUtbetaling, backgroundColor: CHART_COLORS.utbetaling_netto, stack: 'portfolio' },
            { label: 'Skatt', data: prognosis.data.skatt, backgroundColor: CHART_COLORS.utbetaling_skatt, stack: 'portfolio' },
            { label: 'Skatt på hendelser', data: prognosis.data.skatt2, backgroundColor: CHART_COLORS.skatt2, stack: 'portfolio' },
            { label: 'Løpende renteskatt', data: prognosis.data.renteskatt, backgroundColor: CHART_COLORS.renteskatt, stack: 'portfolio' },
        ],
    };

    const allocationChartData = {
        labels: prognosis.labels,
        datasets: [
            { label: 'Aksjeandel', data: prognosis.data.annualStockPercentages, backgroundColor: CHART_COLORS.aksjeandel, borderColor: CHART_COLORS.aksjeandel, fill: true, tension: 0.4 },
            { label: 'Renteandel', data: prognosis.data.annualBondPercentages, backgroundColor: CHART_COLORS.renteandel, borderColor: CHART_COLORS.renteandel, fill: true, tension: 0.4 },
        ],
    };

    const investedCapitalChartData = {
        labels: prognosis.labels,
        datasets: [{ label: 'Innskutt kapital', data: prognosis.data.investedCapitalHistory, backgroundColor: CHART_COLORS.innskutt_kapital, borderColor: CHART_COLORS.innskutt_kapital }],
    };

    const allocationChartOptions = { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, stacked: true, max: 100, ticks: { ...chartOptions.scales.y.ticks, callback: (v) => `${v}%` } } }, plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: '#333333' } } } };
    const capitalChartOptions = { ...chartOptions, scales: { ...chartOptions.scales, y: { ...chartOptions.scales.y, stacked: false } }, plugins: { ...chartOptions.plugins, legend: { display: true, labels: { color: '#333333' } } } };
    
    const totalYears = state.investmentYears + state.payoutYears;
    const maxEventYear = START_YEAR + totalYears - 1;

    return (
        <div className="font-sans text-[#333333] bg-white p-4 sm:p-8 min-h-screen flex justify-center items-start">
            <div className="w-full max-w-[1840px] flex flex-col gap-6">

                <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col">
                    <h1 className="text-3xl md:text-4xl font-bold text-center text-[#4A6D8C] mb-4">Mål og behov</h1>
                    <div className="relative h-[500px]">
                        <Bar options={chartOptions} data={investmentChartData} />
                    </div>
                    <CustomLegend items={LEGEND_DATA} />
                </div>
                
                {showAllocationChart && (
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col">
                         <h2 className="text-xl font-bold text-center text-[#4A6D8C] mb-4">Aksjeandel over tid</h2>
                        <div className="relative h-[300px]">
                           <Line options={allocationChartOptions} data={allocationChartData} />
                        </div>
                    </div>
                )}

                <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col">
                    <h2 className="text-xl font-bold text-center text-[#4A6D8C] mb-4">Innskutt kapital over tid</h2>
                    <div className="relative h-[300px]">
                        <Bar options={capitalChartOptions} data={investedCapitalChartData} />
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Assumptions Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <h2 className="text-2xl font-bold text-[#4A6D8C]">Forutsetninger</h2>
                        <SliderInput id="initialPortfolioSize" label="Porteføljestørrelse (NOK)" value={state.initialPortfolioSize} min={2500000} max={150000000} step={500000} onChange={handleStateChange} isCurrency />
                        <SliderInput id="investedCapital" label="Innskutt kapital (skattefri) (NOK)" value={state.investedCapital} min={0} max={state.initialPortfolioSize} step={100000} onChange={handleStateChange} isCurrency />
                        <SliderInput id="investmentYears" label="Antall år investeringsperiode" value={state.investmentYears} min={1} max={30} step={1} onChange={handleStateChange} unit="år" />
                        <SliderInput id="payoutYears" label="Antall år med utbetaling" value={state.payoutYears} min={0} max={30} step={1} onChange={handleStateChange} unit="år" />
                       
                         <SliderInput id="annualSavings" label="Årlig sparing (NOK)" value={state.annualSavings} min={0} max={10000000} step={10000} onChange={handleStateChange} isCurrency />
                         <DeferredBondTaxToggle value={state.deferredBondTax} onChange={handleStateChange} />
                         <InvestorTypeToggle value={state.investorType} onChange={handleStateChange} />
                         <ResetAllButton onReset={handleResetAll} />
                         
                         {/* Ønsket årlig utbetaling - flyttet ned under Nullstill alt */}
                         <div>
                             <h3 className="text-2xl font-bold text-[#4A6D8C] mb-4">Ønsket årlig utbetaling</h3>
                             <div className="mt-4 space-y-4">
                                 <SliderInput 
                                     id="desiredAnnualConsumptionPayout" 
                                     label="Ønsket årlig uttak til forbruk (NOK)" 
                                     value={state.desiredAnnualConsumptionPayout} 
                                     min={0} 
                                     max={5000000} 
                                     step={50000} 
                                     onChange={handleStateChange} 
                                     isCurrency 
                                 />
                                 <SliderInput 
                                     id="desiredAnnualWealthTaxPayout" 
                                     label="Ønsket årlig uttak til formuesskatt (NOK)" 
                                     value={state.desiredAnnualWealthTaxPayout} 
                                     min={0} 
                                     max={2000000} 
                                     step={25000} 
                                     onChange={handleStateChange} 
                                     isCurrency 
                                 />
                                 <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3">
                                     <div className="text-sm text-[#333333]/70 mb-1">Sum ønsket årlig utbetaling (etter skatt):</div>
                                     <div className="text-lg font-semibold text-[#4A6D8C]">
                                         {formatCurrency(state.desiredAnnualConsumptionPayout + state.desiredAnnualWealthTaxPayout)}
                                     </div>
                                 </div>
                             </div>
                         </div>
                    </div>

                    {/* Parameters Panel */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <h2 className="text-2xl font-bold text-[#4A6D8C]">Parametere</h2>
                        
                        <div>
                            <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Aksjeandel første år (%)</label>
                            <div className="grid grid-cols-4 gap-2 mt-2">
                                {STOCK_ALLOCATION_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => handleStateChange('initialStockAllocation', opt.value)} className={`aspect-square rounded-lg flex items-center justify-center text-center p-1 font-medium transition-all transform hover:-translate-y-0.5 ${state.initialStockAllocation === opt.value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}>
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Aksjeandel nedtrapping</label>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2">
                                {TAPERING_OPTIONS.map(opt => (
                                    <button key={opt.id} onClick={() => handleTaperingChange(opt.value)} className={`p-3 rounded-lg flex flex-col items-center justify-center text-center font-medium transition-all transform hover:-translate-y-0.5 ${state.taperingOption === opt.value ? 'bg-[#66CCDD] text-white shadow-lg' : 'bg-white border border-[#DDDDDD] text-[#333333] hover:bg-gray-100'}`}>
                                        <span>{opt.label}</span>
                                        <span className="text-xs text-[#333333]/70">{opt.sublabel}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <SliderInput id="stockReturnRate" label="Forventet avkastning aksjer" value={state.stockReturnRate} min={6} max={12} step={0.1} onChange={handleStateChange} displayValue={`${state.stockReturnRate.toFixed(1)}%`} />
                        <SliderInput id="bondReturnRate" label="Forventet avkastning renter" value={state.bondReturnRate} min={3} max={9} step={0.1} onChange={handleStateChange} displayValue={`${state.bondReturnRate.toFixed(1)}%`} />
                        
                        {/* Forventet avkastning felt */}
                        <div>
                            <label className="font-medium text-sm uppercase tracking-wider text-[#333333]/80">Forventet avkastning</label>
                            <div className="bg-gray-50 border border-[#DDDDDD] rounded-lg p-3 mt-1">
                                <div className="text-lg font-semibold text-[#4A6D8C]">
                                    {(() => {
                                        const stockAllocation = state.initialStockAllocation / 100;
                                        const bondAllocation = (100 - state.initialStockAllocation) / 100;
                                        const weightedReturn = (stockAllocation * state.stockReturnRate) + (bondAllocation * state.bondReturnRate);
                                        return `${weightedReturn.toFixed(1)}%`;
                                    })()}
                                </div>
                            </div>
                        </div>
                        
                        {/* Skatt seksjon */}
                        <div className="mt-14 md:mt-20 xl:mt-24">
                            <h3 className="text-2xl font-bold text-[#4A6D8C] mb-4">Skatt</h3>
                            <div className="space-y-4">
                                <SliderInput id="shieldingRate" label="Skjermingsrente" value={state.shieldingRate} min={2} max={7} step={0.1} onChange={handleStateChange} displayValue={`${state.shieldingRate.toFixed(1)}%`} />
                                <ManualTaxInput id="manualStockTaxRate" label="Utbytteskatt / skatt aksjer (%)" value={state.manualStockTaxRate} onChange={handleStateChange} />
                                <ManualTaxInput id="manualBondTaxRate" label="Kapitalskatt (%)" value={state.manualBondTaxRate} onChange={handleStateChange} />
                            </div>
                        </div>
                    </div>

                    {/* Events Panel - Moved to bottom left */}
                    <div className="bg-white border border-[#DDDDDD] rounded-xl p-6 flex flex-col gap-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-[#4A6D8C]">Hendelser</h2>
                            <button onClick={handleAddEvent} className="flex items-center gap-2 bg-[#3388CC] hover:bg-[#005599] text-white font-medium py-2 px-4 rounded-lg transition-all transform hover:-translate-y-0.5 shadow-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                                <span>Legg til hendelse</span>
                            </button>
                        </div>
                        
                        <div className="space-y-3 mt-4">
                            {state.events.map(event => (
                                <EventRow key={event.id} event={event} onUpdate={handleUpdateEvent} onRemove={handleRemoveEvent} maxYear={maxEventYear} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- From index.tsx (Mounting logic) ---
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
); 
