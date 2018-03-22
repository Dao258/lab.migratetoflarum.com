import m from 'mithril';
import icon from '../helpers/icon';
import urlError from '../helpers/urlError';
import Warning from './Warning';
import parseHSTS from '../helpers/parseHSTS';
import moment from 'moment';
import httpStatusCodes from '../helpers/httpStatusCodes';

const HeaderReport = {
    view(vnode) {
        let viewIcon = null;

        switch (vnode.attrs.rate) {
            case 'good':
                viewIcon = icon('check', {className: 'text-success'});
                break;
            case 'neutral':
                viewIcon = icon('meh-o', {className: 'text-warning'});
                break;
            case 'bad':
                viewIcon = icon('times', {className: 'text-danger'});
                break;

        }

        return m('tr', [
            m('th', vnode.attrs.name),
            m('td', [
                viewIcon,
                ' ',
                (vnode.attrs.rate === 'bad' ? ['Not found. ', vnode.attrs.suggest] : vnode.attrs.status),
            ]),
        ]);
    },
};

const HSTSReport = {
    view(vnode) {
        const header = vnode.attrs.report.headers && vnode.attrs.report.headers['Strict-Transport-Security'];

        let hsts = null;

        if (header) {
            hsts = parseHSTS(header);
        }

        return m(HeaderReport, {
            name: 'HSTS',
            rate: hsts ? 'good' : 'bad',
            status: (hsts ?
                'Enabled, max age: ' + moment.duration(hsts.maxAge, 'seconds').humanize().replace('a ', '1 ') +
                ', include subdomains: ' + (hsts.includeSubDomains ? 'yes' : 'no') +
                ', preloaded: ' + (hsts.preload ? 'yes' : 'no') : null),
            suggest: [m('a[href=https://scotthelme.co.uk/hsts-the-missing-link-in-tls/]', 'HSTS headers'), ' prevent traffic from being downgraded to HTTP'],
        });
    },
};

const CSPReport = {
    view(vnode) {
        const cspEnforce = vnode.attrs.report.headers && vnode.attrs.report.headers['Content-Security-Policy'];
        const cspReport = vnode.attrs.report.headers && vnode.attrs.report.headers['Content-Security-Policy-Report-Only'];

        return m(HeaderReport, {
            name: 'CSP',
            rate: cspEnforce ? 'good' : (cspReport ? 'neutral' : 'bad'),
            status: cspEnforce ? 'CSP is enabled' : 'CSP is in report only mode',
            suggest: [m('a[href=https://scotthelme.co.uk/content-security-policy-an-introduction/]', 'CSP headers'), ' allow you to whitelist what resources can be used on your page and is an effective measure against XSS'],
        });
    },
};

const UrlReport = {
    view(vnode) {
        const type = vnode.attrs.type;
        const report = vnode.attrs.report;

        return m('.row', [
            m('.col-sm-2', type.toUpperCase()),
            m('.col-sm-10', [
                (report.type === 'ok' ? [
                    m('p', [icon('check', {className: 'text-success'}), ' Got valid response']),
                    (type === 'http' ? m(Warning, {
                        description: 'HTTP is insecure and should\'t be used to serve any content',
                        suggestion: 'Serve a redirect to HTTPS instead',
                    }) : null),
                ] : null),
                (report.type === 'redirect' ? [
                    m('p', [icon('long-arrow-right'), ' ' + (report.status === 301 ? 'Permanent' : 'Temporary') + ' redirect to ', report.redirect_to]),
                    (report.status === 302 ? [
                        m(Warning, {
                            description: report.redirect_to.indexOf('https://') === 0 ?
                                'Temporary redirects to https offer no security forward in time' :
                                'Temporary redirects aren\'t cached by browsers and search engines',
                            suggestion: 'Consider using a 301 permanent redirect instead (the browsers and search engines will cache it)',
                        }),
                    ] : null),
                ] : null),
                (report.type === 'httperror' ? (() => {
                    return [
                        icon('times', {className: 'text-danger'}),
                        ' Received status code ' + report.status + ' (' + (httpStatusCodes[report.status] || 'Unknown status code') + ')',
                    ];
                })() : null),
                (report.type === 'error' ? (() => {
                    const error = urlError(report);

                    return [
                        icon('times', {className: 'text-danger'}),
                        m(Warning, {
                            description: error.description,
                            suggestion: error.suggest,
                            log: report.exception_message,
                        }),
                    ];
                })() : null),
                (type === 'https' ? [
                    m('table.table', [
                        m('tbody', [
                            m(HSTSReport, {
                                report,
                            }),
                            (report.type === 'ok' ? m(CSPReport, {
                                report,
                            }) : null),
                        ]),
                    ]),
                ] : null),
            ]),
        ]);
    },
};

export default {
    view(vnode) {
        // If the report does not exist or is incomplete for this domain we don't show anything
        // Most likely a report for an IP that has no www domain
        if (!vnode.attrs.httpReport || !vnode.attrs.httpsReport) {
            return null;
        }

        const sameError = vnode.attrs.httpReport.type === 'error' && vnode.attrs.httpsReport.type === 'error' && vnode.attrs.httpReport.exception_message === vnode.attrs.httpsReport.exception_message;

        let error;

        if (sameError) {
            error = urlError(vnode.attrs.httpReport);
        }

        return m('.list-group-item', [
            m('p', '//' + vnode.attrs.address),
            (sameError ? [
                m(Warning, {
                    description: error.description,
                    suggestion: error.suggest,
                    log: vnode.attrs.httpReport.exception_message,
                }),
            ] : [
                m(UrlReport, {
                    report: vnode.attrs.httpReport,
                    type: 'http',
                }),
                m(UrlReport, {
                    report: vnode.attrs.httpsReport,
                    type: 'https',
                }),
            ]),
        ]);
    },
}
