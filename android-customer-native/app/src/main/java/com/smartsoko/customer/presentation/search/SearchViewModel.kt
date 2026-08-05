package com.smartsoko.customer.presentation.search

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.usecase.SearchProductsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SearchUiState(
    val query: String = "",
    val isSearching: Boolean = false,
    val showHistory: Boolean = true,
    val recentSearches: List<String> = emptyList(),
    val hasSearched: Boolean = false
)

@HiltViewModel
class SearchViewModel @Inject constructor(
    private val searchProductsUseCase: SearchProductsUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(SearchUiState())
    val uiState: StateFlow<SearchUiState> = _uiState.asStateFlow()

    private val _searchResults = MutableStateFlow<PagingData<Product>>(PagingData.empty())
    val searchResults: StateFlow<PagingData<Product>> = _searchResults.asStateFlow()

    private var searchJob: Job? = null

    fun onQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(query = query, showHistory = query.isBlank())
        if (query.isNotBlank()) {
            searchJob?.cancel()
            searchJob = viewModelScope.launch {
                delay(300)
                performSearch(query)
            }
        }
    }

    fun onSearch(query: String) {
        if (query.isNotBlank()) {
            performSearch(query)
            addToRecentSearches(query)
        }
    }

    fun clearSearch() {
        _uiState.value = _uiState.value.copy(query = "", showHistory = true, hasSearched = false)
        _searchResults.value = PagingData.empty()
    }

    fun clearRecentSearches() {
        _uiState.value = _uiState.value.copy(recentSearches = emptyList())
    }

    private fun performSearch(query: String) {
        searchJob?.cancel()
        _uiState.value = _uiState.value.copy(isSearching = true, showHistory = false, hasSearched = true)
        viewModelScope.launch {
            searchProductsUseCase(query).cachedIn(viewModelScope).collect { pagingData ->
                _searchResults.value = pagingData
                _uiState.value = _uiState.value.copy(isSearching = false)
            }
        }
    }

    private fun addToRecentSearches(query: String) {
        val current = _uiState.value.recentSearches.toMutableList()
        current.remove(query)
        current.add(0, query)
        if (current.size > 10) current.removeAt(current.lastIndex)
        _uiState.value = _uiState.value.copy(recentSearches = current)
    }
}
