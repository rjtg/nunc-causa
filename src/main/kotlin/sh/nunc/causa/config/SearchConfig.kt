package sh.nunc.causa.config

import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurer
import org.hibernate.search.backend.lucene.analysis.LuceneAnalysisConfigurationContext
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class SearchConfig {
    @Bean
    fun luceneAnalysisConfigurer(): LuceneAnalysisConfigurer {
        return LuceneAnalysisConfigurer { context ->
            configureAnalyzers(context)
        }
    }

    private fun configureAnalyzers(context: LuceneAnalysisConfigurationContext) {
        context.analyzer("autocomplete").custom()
            .tokenizer("standard")
            .tokenFilter("lowercase")
            .tokenFilter("edgeNGram")
                .param("minGramSize", "2")
                .param("maxGramSize", "15")

        context.analyzer("autocompleteSearch").custom()
            .tokenizer("standard")
            .tokenFilter("lowercase")
    }
}
