/* FRONTEND-ONLY SCRIPT.JS
   --------------------------------
   ✔ No Login / No Register
   ✔ Single-user finance storage
   ✔ Works 100% offline
*/

function qs(s) { return document.querySelector(s); }
function qsa(s) { return [...document.querySelectorAll(s)]; }

const rupee = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

// ---------------------------
// UTILITIES
// ---------------------------
function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>\"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[m]);
}

function showToast(message) {
  alert(message);
}

// ---------------------------
// PAGE ROUTER
// ---------------------------
document.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;

  if (page === "inputs") initInputs();
  if (page === "dashboard") initDashboard();
});

// ---------------------------
// INPUTS PAGE
// ---------------------------
function initInputs() {

  const key = "finance_data";
  const saved = JSON.parse(localStorage.getItem(key) || "{}");

  // Prefill data
  qs("#income").value = saved.income || "";

  const expensesList = qs("#expenses-list");
  expensesList.innerHTML = "";

  (saved.expenses || [{ name: "", amount: "" }]).forEach(e => {
    addExpenseRow(e.name, e.amount);
  });

  qs("#goal-name").value = saved.goalName || "";
  qs("#goal-amount").value = saved.goalAmount || "";
  qs("#goal-years").value = saved.goalYears || "";
  qs("#ret-age").value = saved.retAge || "";
  qs("#ret-target-age").value = saved.retTargetAge || "";
  qs("#ret-target-amt").value = saved.retTargetAmt || "";

  // Add expense row
  qs("#add-exp").onclick = () => addExpenseRow();

  // Save and go to dashboard
  qs("#save-and-go").onclick = () => {
    const data = {
      income: parseFloat(qs("#income").value) || 0,
      expenses: qsa(".expense-row").map(r => ({
        name: r.querySelector(".exp-name").value.trim(),
        amount: parseFloat(r.querySelector(".exp-amt").value) || 0
      })),
      goalName: qs("#goal-name").value.trim(),
      goalAmount: parseFloat(qs("#goal-amount").value) || 0,
      goalYears: parseFloat(qs("#goal-years").value) || 0,
      retAge: parseInt(qs("#ret-age").value) || 0,
      retTargetAge: parseInt(qs("#ret-target-age").value) || 0,
      retTargetAmt: parseFloat(qs("#ret-target-amt").value) || 0
    };

    localStorage.setItem(key, JSON.stringify(data));
    showToast("Data saved successfully!");
    location.href = "dashboard.html";
  };

  // Clear all data
  qs("#clear-all").onclick = () => {
    localStorage.removeItem(key);
    location.reload();
  };
}

// ---------------------------
// CREATE EXPENSE ROW
// ---------------------------
function addExpenseRow(name = "", amount = "") {
  const row = document.createElement("div");
  row.className = "row g-2 mb-2 expense-row";
  row.innerHTML = `
    <div class="col-md-6">
      <input class="form-control exp-name" placeholder="Expense name" value="${name}">
    </div>
    <div class="col-md-4">
      <input class="form-control exp-amt" type="number" placeholder="Amount" value="${amount}">
    </div>
    <div class="col-md-2">
      <button class="btn btn-danger remove-exp w-100">✖</button>
    </div>
  `;
  qs("#expenses-list").appendChild(row);
  row.querySelector(".remove-exp").onclick = () => row.remove();
}

// ---------------------------
// DASHBOARD PAGE
// ---------------------------
function initDashboard() {

  const key = "finance_data";
  const d = JSON.parse(localStorage.getItem(key) || "{}");

  const income = d.income || 0;
  const expenses = d.expenses || [];
  const totalExp = expenses.reduce((a, b) => a + b.amount, 0);
  const savings = income - totalExp;

  qs("#show-income").textContent = rupee.format(income);
  qs("#show-expenses").textContent = rupee.format(totalExp);
  qs("#show-savings").textContent = rupee.format(savings);

  // Edit button
  qs("#btn-edit").onclick = () => location.href = "inputs.html";

  // Expense chart
  if (expenses.length) {
    const ctx = qs("#expChart").getContext("2d");
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: expenses.map(e => e.name),
        datasets: [{
          data: expenses.map(e => e.amount),
          backgroundColor: expenses.map((_, i) => `hsl(${i * 50}, 70%, 55%)`)
        }]
      }
    });
  }

  // Goal summary
  if (d.goalAmount && d.goalYears) {
    const required = d.goalAmount / (d.goalYears * 12);
    qs("#goal-summary").innerHTML = `
      <p><b>${escapeHtml(d.goalName)}</b>: ${rupee.format(d.goalAmount)}</p>
      <p>Monthly Saving Needed: <b>${rupee.format(Math.ceil(required))}</b></p>
    `;
  } else {
    qs("#goal-summary").textContent = "No goal data available.";
  }

  // Retirement plan
  if (d.retAge && d.retTargetAge && d.retTargetAmt && d.retTargetAge > d.retAge) {
    const years = d.retTargetAge - d.retAge;
    const r = 0.15 / 12;
    const n = years * 12;
    const sip = d.retTargetAmt * r / (Math.pow(1 + r, n) - 1);

    qs("#retire-summary").innerHTML = `
      <p>Target Amount: ${rupee.format(d.retTargetAmt)}</p>
      <p>Years to Invest: ${years}</p>
      <p>Required Monthly SIP: <b>${rupee.format(Math.ceil(sip))}</b></p>
    `;
  } else {
    qs("#retire-card").style.display = "none";
  }

  // Clear data
  qs("#clear-storage").onclick = () => {
    localStorage.removeItem(key);
    location.href = "inputs.html";
  };
}
