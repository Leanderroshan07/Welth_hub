import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

function money(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(Number(value || 0));
}

export default function CashFlow({ accounts, entries, onDataRefresh, showToast }) {
  const [accountNameInput, setAccountNameInput] = useState('');
  const [editingAccountId, setEditingAccountId] = useState('');
  const [showAccountForm, setShowAccountForm] = useState(false);

  const [subAccounts, setSubAccounts] = useState([]);
  const [subAccountNameInput, setSubAccountNameInput] = useState('');
  const [editingSubAccountId, setEditingSubAccountId] = useState('');
  const [showSubAccountForm, setShowSubAccountForm] = useState(false);

  const [categories, setCategories] = useState([]);
  const [categoryNameInput, setCategoryNameInput] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState('');
  const [showCategoryForm, setShowCategoryForm] = useState(false);

  const [subCategories, setSubCategories] = useState([]);
  const [subCategoryNameInput, setSubCategoryNameInput] = useState('');
  const [subCategoryCategoryId, setSubCategoryCategoryId] = useState('');
  const [editingSubCategoryId, setEditingSubCategoryId] = useState('');
  const [showSubCategoryForm, setShowSubCategoryForm] = useState(false);

  useEffect(() => {
    loadSubAccounts();
    loadCategories();
    loadSubCategories();
  }, []);

  async function loadSubAccounts() {
    const { data, error } = await supabase.from('sub_accounts').select('*').order('created_at', { ascending: true });
    if (!error) {
      setSubAccounts(data || []);
    }
  }

  async function loadCategories() {
    const { data, error } = await supabase.from('categories').select('*').order('created_at', { ascending: true });
    if (!error) {
      setCategories(data || []);
    }
  }

  async function loadSubCategories() {
    const { data, error } = await supabase.from('sub_categories').select('*').order('created_at', { ascending: true });
    if (!error) {
      setSubCategories(data || []);
    }
  }

  const accountBalances = useMemo(() => {
    const amountByName = new Map();

    accounts.forEach((account) => {
      amountByName.set(account.name, Number(account.opening_balance || 0));
    });

    entries.forEach((entry) => {
      const amount = Number(entry.amount || 0);

      if (entry.entry_type === 'income' && entry.account_name) {
        amountByName.set(entry.account_name, (amountByName.get(entry.account_name) || 0) + amount);
      }

      if (entry.entry_type === 'expense' && entry.account_name) {
        amountByName.set(entry.account_name, (amountByName.get(entry.account_name) || 0) - amount);
      }

      if (entry.entry_type === 'transfer') {
        if (entry.from_account) {
          amountByName.set(entry.from_account, (amountByName.get(entry.from_account) || 0) - amount);
        }
        if (entry.to_account) {
          amountByName.set(entry.to_account, (amountByName.get(entry.to_account) || 0) + amount);
        }
      }
    });

    return accounts.map((account) => ({
      ...account,
      balance: amountByName.get(account.name) || 0,
    }));
  }, [accounts, entries]);

  const subAccountBalances = useMemo(() => {
    const amountBySubAccountId = new Map();
    const amountBySubAccountAndAccount = new Map();

    subAccounts.forEach((subAccount) => {
      amountBySubAccountId.set(subAccount.id, Number(subAccount.opening_balance || 0));
      amountBySubAccountAndAccount.set(subAccount.id, new Map());
    });

    entries.forEach((entry) => {
      const amount = Number(entry.amount || 0);

      if (entry.sub_account_id) {
        const delta = entry.entry_type === 'expense' ? -amount : amount;
        const currentTotal = amountBySubAccountId.get(entry.sub_account_id) || 0;
        amountBySubAccountId.set(entry.sub_account_id, currentTotal + delta);

        const accountName = entry.account_name || entry.from_account || entry.to_account || 'Unassigned';
        const byAccount = amountBySubAccountAndAccount.get(entry.sub_account_id) || new Map();
        byAccount.set(accountName, (byAccount.get(accountName) || 0) + delta);
        amountBySubAccountAndAccount.set(entry.sub_account_id, byAccount);
      }
    });

    return subAccounts.map((subAccount) => ({
      ...subAccount,
      totalBalance: amountBySubAccountId.get(subAccount.id) || 0,
      accountBreakdown: Array.from(amountBySubAccountAndAccount.get(subAccount.id)?.entries() || []).map(
        ([accountName, balance]) => ({ accountName, balance }),
      ),
    }));
  }, [subAccounts, entries]);

  const accountDisplayBalances = useMemo(
    () =>
      accountBalances.map((account) => ({
        ...account,
        availableBalance: Number(account.balance || 0),
      })),
    [accountBalances],
  );

  const totalAccountBalance = useMemo(
    () => accountDisplayBalances.reduce((sum, account) => sum + Number(account.availableBalance || 0), 0),
    [accountDisplayBalances],
  );

  const totalSubAccountBalance = useMemo(
    () => subAccountBalances.reduce((sum, subAccount) => sum + Number(subAccount.totalBalance || 0), 0),
    [subAccountBalances],
  );

  const cashFlowNetBalance = totalAccountBalance + totalSubAccountBalance;

  const cashFlowSummaryCards = [
    {
      key: 'accounts',
      label: 'Main Accounts',
      value: accountDisplayBalances.length,
      subtitle: 'Core money containers',
      icon: 'account_balance_wallet',
      tone: 'primary',
    },
    {
      key: 'subaccounts',
      label: 'Sub-Accounts',
      value: subAccountBalances.length,
      subtitle: 'Shared buckets',
      icon: 'category',
      tone: 'secondary',
    },
    {
      key: 'categories',
      label: 'Categories',
      value: categories.length,
      subtitle: 'Income and expense labels',
      icon: 'sell',
      tone: 'tertiary',
    },
    {
      key: 'subcategories',
      label: 'Sub-Categories',
      value: subCategories.length,
      subtitle: 'Nested category labels',
      icon: 'label_important',
      tone: 'secondary',
    },
  ];

  async function saveAccount() {
    const cleanName = accountNameInput.trim();

    if (!cleanName) {
      showToast('Please enter account name', 'error');
      return;
    }

    const isEditing = Boolean(editingAccountId);
    const { error: accountError } = isEditing
      ? await supabase.from('accounts').update({ name: cleanName }).eq('id', editingAccountId)
      : await supabase.from('accounts').insert({ name: cleanName, opening_balance: 0 });

    if (accountError) {
      showToast(accountError.message, 'error');
      return;
    }

    setAccountNameInput('');
    setEditingAccountId('');
    setShowAccountForm(false);
    await onDataRefresh();
    showToast(isEditing ? 'Account updated successfully.' : 'Account added successfully.', 'success');
  }

  function startEditAccount(account) {
    setEditingAccountId(account.id);
    setAccountNameInput(account.name);
    setShowAccountForm(true);
  }

  async function deleteAccount(accountId) {
    const { error: accountError } = await supabase.from('accounts').delete().eq('id', accountId);

    if (accountError) {
      showToast(accountError.message, 'error');
      return;
    }

    if (editingAccountId === accountId) {
      setEditingAccountId('');
      setAccountNameInput('');
    }

    await onDataRefresh();
    showToast('Account deleted successfully.', 'success');
  }

  async function saveSubAccount() {
    const cleanName = subAccountNameInput.trim();

    if (!cleanName) {
      showToast('Please enter sub-account name', 'error');
      return;
    }

    const isEditing = Boolean(editingSubAccountId);
    const { error: subAccountError } = isEditing
      ? await supabase.from('sub_accounts').update({
          name: cleanName,
        }).eq('id', editingSubAccountId)
      : await supabase.from('sub_accounts').insert({
          name: cleanName,
          opening_balance: 0,
        });

    if (subAccountError) {
      showToast(subAccountError.message, 'error');
      return;
    }

    setSubAccountNameInput('');
    setEditingSubAccountId('');
    setShowSubAccountForm(false);
    await loadSubAccounts();
    await onDataRefresh();
    showToast(isEditing ? 'Sub-account updated successfully.' : 'Sub-account added successfully.', 'success');
  }

  function startEditSubAccount(subAccount) {
    setEditingSubAccountId(subAccount.id);
    setSubAccountNameInput(subAccount.name);
    setShowSubAccountForm(true);
  }

  async function deleteSubAccount(subAccountId) {
    const { error: subAccountError } = await supabase.from('sub_accounts').delete().eq('id', subAccountId);

    if (subAccountError) {
      showToast(subAccountError.message, 'error');
      return;
    }

    if (editingSubAccountId === subAccountId) {
      setEditingSubAccountId('');
      setSubAccountNameInput('');
    }

    await loadSubAccounts();
    await onDataRefresh();
    showToast('Sub-account deleted successfully.', 'success');
  }

  async function saveCategory() {
    const cleanName = categoryNameInput.trim();

    if (!cleanName) {
      showToast('Please enter category name', 'error');
      return;
    }

    const isEditing = Boolean(editingCategoryId);
    const { error: categoryError } = isEditing
      ? await supabase.from('categories').update({ name: cleanName }).eq('id', editingCategoryId)
      : await supabase.from('categories').insert({ name: cleanName });

    if (categoryError) {
      showToast(categoryError.message, 'error');
      return;
    }

    setCategoryNameInput('');
    setEditingCategoryId('');
    setShowCategoryForm(false);
    await loadCategories();
    showToast(isEditing ? 'Category updated successfully.' : 'Category added successfully.', 'success');
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCategoryNameInput(category.name);
    setShowCategoryForm(true);
  }

  async function deleteCategory(categoryId) {
    const { error: categoryError } = await supabase.from('categories').delete().eq('id', categoryId);

    if (categoryError) {
      showToast(categoryError.message, 'error');
      return;
    }

    if (editingCategoryId === categoryId) {
      setEditingCategoryId('');
      setCategoryNameInput('');
    }

    await loadCategories();
    await loadSubCategories();
    showToast('Category deleted successfully.', 'success');
  }

  async function saveSubCategory() {
    const cleanName = subCategoryNameInput.trim();

    if (!cleanName) {
      showToast('Please enter sub-category name', 'error');
      return;
    }

    if (!subCategoryCategoryId) {
      showToast('Please choose a parent category', 'error');
      return;
    }

    const isEditing = Boolean(editingSubCategoryId);
    const { error: subCategoryError } = isEditing
      ? await supabase
          .from('sub_categories')
          .update({
            name: cleanName,
            category_id: subCategoryCategoryId,
          })
          .eq('id', editingSubCategoryId)
      : await supabase.from('sub_categories').insert({
          name: cleanName,
          category_id: subCategoryCategoryId,
        });

    if (subCategoryError) {
      showToast(subCategoryError.message, 'error');
      return;
    }

    setSubCategoryNameInput('');
    setSubCategoryCategoryId('');
    setEditingSubCategoryId('');
    setShowSubCategoryForm(false);
    await loadSubCategories();
    showToast(isEditing ? 'Sub-category updated successfully.' : 'Sub-category added successfully.', 'success');
  }

  function startEditSubCategory(subCategory) {
    setEditingSubCategoryId(subCategory.id);
    setSubCategoryNameInput(subCategory.name);
    setSubCategoryCategoryId(subCategory.category_id);
    setShowSubCategoryForm(true);
  }

  async function deleteSubCategory(subCategoryId) {
    const { error: subCategoryError } = await supabase.from('sub_categories').delete().eq('id', subCategoryId);

    if (subCategoryError) {
      showToast(subCategoryError.message, 'error');
      return;
    }

    if (editingSubCategoryId === subCategoryId) {
      setEditingSubCategoryId('');
      setSubCategoryNameInput('');
      setSubCategoryCategoryId('');
    }

    await loadSubCategories();
    showToast('Sub-category deleted successfully.', 'success');
  }

  const categoryNameById = useMemo(() => {
    const mapped = new Map();
    categories.forEach((category) => {
      mapped.set(category.id, category.name);
    });
    return mapped;
  }, [categories]);

  const groupedSubCategories = useMemo(() => {
    const grouped = new Map();

    subCategories.forEach((subCategory) => {
      const key = subCategory.category_id || 'unknown';
      const parentName = categoryNameById.get(subCategory.category_id) || 'Unknown Category';

      if (!grouped.has(key)) {
        grouped.set(key, {
          key,
          parentName,
          items: [],
        });
      }

      grouped.get(key).items.push(subCategory);
    });

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        items: [...group.items].sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''))),
      }))
      .sort((left, right) => left.parentName.localeCompare(right.parentName));
  }, [categoryNameById, subCategories]);

  return (
    <section className="cashflow-page">
      <section className="cashflow-hero glass-panel">
        <div className="cashflow-hero-copy">
          <p className="cashflow-eyebrow">Cash Flow Admin</p>
          <h2>Control accounts, shared buckets, and categories from one glass dashboard.</h2>
          <p>
            A premium overview for your cash flow structure with softer panels, fused shadows, and blurred depth.
          </p>
        </div>

        <div className="cashflow-hero-aside">
          <div className="cashflow-hero-balance">
            <span className="cashflow-hero-balance-label">Net Cash</span>
            <strong>{money(cashFlowNetBalance)}</strong>
            <small>{accountDisplayBalances.length} accounts · {subAccountBalances.length} sub-accounts</small>
          </div>
        </div>
      </section>

      <section className="cashflow-stats-grid">
        {cashFlowSummaryCards.map((card) => (
          <article key={card.key} className={`cashflow-stat-card cashflow-stat-card--${card.tone}`}>
            <div className="cashflow-stat-top">
              <div className={`cashflow-stat-icon cashflow-stat-icon--${card.tone}`}>
                <span className="material-symbols-outlined">{card.icon}</span>
              </div>
              <span className="cashflow-stat-chip">Live</span>
            </div>
            <p className="cashflow-stat-label">{card.label}</p>
            <div className="cashflow-stat-value">{typeof card.value === 'number' && card.label !== 'Net Cash' ? card.value : money(card.value)}</div>
            <p className="cashflow-stat-subtitle">{card.subtitle}</p>
          </article>
        ))}
      </section>

      <section className="cashflow-section-stack">
      <section className="cashflow-panel glass-panel">
        <div className="manager-title-row">
          <div>
            <h2>Accounts</h2>
            <p>Manage your main money sources.</p>
          </div>
          <button
            type="button"
            className="icon-plus-btn"
            onClick={() => {
              setShowAccountForm((current) => !current);
              setAccountNameInput('');
              setEditingAccountId('');
            }}
            aria-label="Add account"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <section className="balance-grid balance-grid--large">
        {showAccountForm ? (
          <article className="balance-card add-account-card balance-card--glow">
            <p>Add Account</p>
            <div className="manager-input-row">
              <input
                value={accountNameInput}
                onChange={(event) => setAccountNameInput(event.target.value)}
                placeholder="Account name"
              />
              <button type="button" onClick={saveAccount}>
                {editingAccountId ? 'Update' : 'Add'}
              </button>
            </div>

            <div className="chip-list">
              {accountDisplayBalances.map((account) => (
                <div key={account.id} className="edit-chip">
                  <div>
                    <span>{account.name}</span>
                    <small>{money(account.availableBalance)}</small>
                  </div>
                  <div className="chip-actions">
                    <button type="button" onClick={() => startEditAccount(account)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteAccount(account.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {accountDisplayBalances.map((account) => (
          <article key={account.id} className="balance-card balance-card--glow">
            <p>{account.name}</p>
            <h4>{money(account.availableBalance)}</h4>
            <small>Opening: {money(account.opening_balance || 0)}</small>
          </article>
        ))}
        </section>
      </section>

      <section className="cashflow-panel glass-panel">
        <div className="manager-title-row">
          <div>
            <h2>Sub-Accounts</h2>
            <p>Shared buckets with a softer, layered presentation.</p>
          </div>
          <button
            type="button"
            className="icon-plus-btn"
            onClick={() => {
              setShowSubAccountForm((current) => !current);
              setSubAccountNameInput('');
              setEditingSubAccountId('');
            }}
            aria-label="Add sub-account"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <section className="balance-grid balance-grid--large">
        {showSubAccountForm ? (
          <article className="balance-card add-account-card balance-card--glow">
            <p>Add Sub-Account</p>
            <div className="manager-input-row">
              <input
                value={subAccountNameInput}
                onChange={(event) => setSubAccountNameInput(event.target.value)}
                placeholder="Sub-account name"
              />
              <button type="button" onClick={saveSubAccount}>
                {editingSubAccountId ? 'Update' : 'Add'}
              </button>
            </div>

            <div className="chip-list">
              {subAccountBalances.map((subAccount) => (
                <div key={subAccount.id} className="edit-chip">
                  <div>
                    <span>{subAccount.name}</span>
                    <small>{money(subAccount.totalBalance)}</small>
                  </div>
                  <div className="chip-actions">
                    <button type="button" onClick={() => startEditSubAccount(subAccount)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteSubAccount(subAccount.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {subAccountBalances.map((subAccount) => {
          return (
            <article key={subAccount.id} className="balance-card balance-card--glow">
              <p>{subAccount.name}</p>
              <h4>{money(subAccount.totalBalance)}</h4>
              <small>Shared with all main accounts</small>
              <div className="sub-account-breakdown">
                {subAccount.accountBreakdown.length ? (
                  subAccount.accountBreakdown.map((item) => (
                    <small key={`${subAccount.id}-${item.accountName}`}>
                      {item.accountName}: {money(item.balance)}
                    </small>
                  ))
                ) : (
                  <small>No account amounts yet</small>
                )}
              </div>
            </article>
          );
        })}
        </section>
      </section>

      <section className="cashflow-panel glass-panel">
        <div className="manager-title-row">
          <div>
            <h2>Categories</h2>
            <p>Manage expense and income labels with the same layered treatment.</p>
          </div>
          <button
            type="button"
            className="icon-plus-btn"
            onClick={() => {
              setShowCategoryForm((current) => !current);
              setCategoryNameInput('');
              setEditingCategoryId('');
            }}
            aria-label="Add category"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <section className="balance-grid balance-grid--large">
        {showCategoryForm ? (
          <article className="balance-card add-account-card balance-card--glow">
            <p>Add Category</p>
            <div className="manager-input-row">
              <input
                value={categoryNameInput}
                onChange={(event) => setCategoryNameInput(event.target.value)}
                placeholder="Category name"
              />
              <button type="button" onClick={saveCategory}>
                {editingCategoryId ? 'Update' : 'Add'}
              </button>
            </div>

            <div className="chip-list">
              {categories.map((category) => (
                <div key={category.id} className="edit-chip">
                  <div>
                    <span>{category.name}</span>
                  </div>
                  <div className="chip-actions">
                    <button type="button" onClick={() => startEditCategory(category)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => deleteCategory(category.id)}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ) : null}

        {categories.map((category) => (
          <article key={category.id} className="balance-card balance-card--glow">
            <p>{category.name}</p>
            <small>Category</small>
          </article>
        ))}
        </section>
      </section>

      <section className="cashflow-panel glass-panel">
        <div className="manager-title-row">
          <div>
            <h2>Sub-Categories</h2>
            <p>Create sub-categories under each category.</p>
          </div>
          <button
            type="button"
            className="icon-plus-btn"
            onClick={() => {
              setShowSubCategoryForm((current) => !current);
              setSubCategoryNameInput('');
              setSubCategoryCategoryId(categories[0]?.id || '');
              setEditingSubCategoryId('');
            }}
            aria-label="Add sub-category"
          >
            <span className="material-symbols-outlined">add</span>
          </button>
        </div>

        <section className="balance-grid balance-grid--large">
          {showSubCategoryForm ? (
            <article className="balance-card add-account-card balance-card--glow">
              <p>Add Sub-Category</p>
              <div className="manager-input-row">
                <input
                  value={subCategoryNameInput}
                  onChange={(event) => setSubCategoryNameInput(event.target.value)}
                  placeholder="Sub-category name"
                />
                <select value={subCategoryCategoryId} onChange={(event) => setSubCategoryCategoryId(event.target.value)}>
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <button type="button" onClick={saveSubCategory}>
                  {editingSubCategoryId ? 'Update' : 'Add'}
                </button>
              </div>

              <div className="chip-list">
                {groupedSubCategories.map((group) => (
                  <div key={group.key} className="edit-chip">
                    <div>
                      <span>{group.parentName}</span>
                      <small>{group.items.length} sub-categories</small>
                    </div>

                    <div className="sub-category-group-list">
                      {group.items.map((subCategory) => (
                        <div key={subCategory.id} className="sub-category-group-item">
                          <span>{subCategory.name}</span>
                          <div className="chip-actions">
                            <button type="button" onClick={() => startEditSubCategory(subCategory)}>
                              Edit
                            </button>
                            <button type="button" onClick={() => deleteSubCategory(subCategory.id)}>
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ) : null}

          {groupedSubCategories.map((group) => (
            <article key={group.key} className="balance-card balance-card--glow">
              <p>{group.parentName}</p>
              <small>{group.items.map((subCategory) => subCategory.name).join(' · ')}</small>
            </article>
          ))}
        </section>
      </section>
      </section>
    </section>
  );
}
