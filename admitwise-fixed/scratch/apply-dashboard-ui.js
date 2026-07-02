const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../components/plans/dashboard-client.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

const profileStatRowComponent = `
function ProfileStatRow({ title, stats, baseLimit, addons, colorClass }: any) {
  return (
    <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/50">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <div className="text-xs font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 shadow-sm">
          Used: <span className="text-slate-900">{stats.used}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Base</p>
          <p className="font-bold text-slate-700">{baseLimit}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Add-ons</p>
          <p className="font-bold text-blue-600">+{addons}</p>
        </div>
        <div className="bg-white rounded-lg p-2 border border-slate-200 flex flex-col justify-center">
          <p className="text-slate-400 text-[9px] font-bold uppercase mb-1">Allowed</p>
          <p className="font-bold text-slate-900">{stats.max}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 border border-blue-200 flex flex-col justify-center shadow-sm">
          <p className="text-blue-600 text-[9px] font-bold uppercase mb-1">Remaining</p>
          <p className="font-bold text-blue-700 text-sm">{stats.remaining}</p>
        </div>
      </div>
    </div>
  )
}
`;

if (!content.includes('function ProfileStatRow')) {
  content += '\n' + profileStatRowComponent;
}

const startIndex = content.indexOf('{/* Left column */}');
const endIndex = content.indexOf('{/* Saved predictor profiles */}');

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find start/end indices.");
  process.exit(1);
}

const newLeftColumn = `{/* Left column */}
      <div className="space-y-6">
        
        {/* CURRENT SUBSCRIPTION */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-4">
            Current Subscription
          </p>
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-5">
            <div>
              <h2 className="font-heading text-2xl font-bold text-slate-900">
                {(sub.plan as string) === "free" ? "Free Plan" : (planDetails?.name ?? sub.plan)}
              </h2>
              {planDetails?.price !== undefined && (
                <p className="mt-1 text-lg font-bold text-slate-700">₹{planDetails.price}</p>
              )}
            </div>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
              Active
            </span>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-slate-500 mb-1 font-medium">Activated On</p>
              <p className="font-bold text-slate-800">{formatDate(sub.activatedAt)}</p>
            </div>
            <div>
              <p className="text-slate-500 mb-1 font-medium">Base Profile Limits</p>
              <p className="font-bold text-slate-800">{basePlanLimit} profiles per category</p>
            </div>
          </div>
          
          {planDetails?.features && planDetails.features.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <p className="text-xs font-bold text-slate-700 mb-3">Included Features</p>
              <ul className="space-y-2.5">
                {planDetails.features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-slate-600 font-medium">
                    <Check className="h-4 w-4 text-blue-500 shrink-0 mt-0" />
                    <span className="leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* PURCHASED ADD-ONS */}
        {purchasedAddons > 0 && (
          <div className="glass-card rounded-2xl p-6 shadow-md border border-blue-200 bg-blue-50/40 backdrop-blur-sm relative overflow-hidden">
            {/* Background glow */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-400/20 blur-2xl" />
            
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-4">
              Purchased Add-ons
            </p>
            
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <h3 className="font-heading text-lg font-bold text-slate-900">Extra Profile Add-ons</h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">Purchased: <span className="font-bold text-slate-700">{purchasedAddons}</span></p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white border border-blue-200 text-blue-700 font-bold text-lg shadow-sm">
                +{purchasedAddons}
              </div>
            </div>
            
            <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-sm relative z-10">
              <p className="text-xs font-bold text-slate-700 mb-3">Each Add-on Includes:</p>
              <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px] text-slate-600 font-semibold">
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> CET Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> JEE Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> NEET Profile</div>
                <div className="flex items-center gap-1.5"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> CET (All India)</div>
                <div className="flex items-center gap-1.5 col-span-2"><span className="text-blue-600 font-bold bg-blue-50 px-1 rounded border border-blue-100">+1</span> Vacant Seat Category</div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                <span className="font-bold text-slate-700">Total Extra Profiles Added:</span>
                <span className="font-extrabold text-blue-700 text-sm">+{purchasedAddons} per category</span>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE SUMMARY */}
        <div className="glass-card rounded-2xl p-6 shadow-md border border-slate-200 bg-white/90 backdrop-blur-sm">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-5">
            Profile Summary
          </p>
          
          <div className="space-y-4">
            <ProfileStatRow title="MHT CET" stats={stats.mhtCet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="JEE (Main)" stats={stats.jeeMain} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="NEET" stats={stats.neet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="MHT CET (All India)" stats={stats.mhtCet} baseLimit={basePlanLimit} addons={purchasedAddons} />
            <ProfileStatRow title="Vacant Seat Tracker" stats={stats.tracker} baseLimit={basePlanLimit} addons={purchasedAddons} />
          </div>
        </div>
      </div>
    </div>

    `;

const before = content.substring(0, startIndex);
const after = content.substring(endIndex);

fs.writeFileSync(filePath, before + newLeftColumn + '    ' + after);
console.log('Successfully updated the UI!');
